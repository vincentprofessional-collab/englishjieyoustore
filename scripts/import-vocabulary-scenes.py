"""Import reviewed scene metadata; keep original image bytes out of Git/Vercel."""
import argparse, hashlib, json, subprocess
from pathlib import Path

p = argparse.ArgumentParser()
p.add_argument('--source', required=True)
p.add_argument('--plan', required=True)
a = p.parse_args()
root = Path(__file__).resolve().parents[1]
source = Path(a.source).resolve()
out = root / 'src/data/vocabulary-scenes'
out.mkdir(parents=True, exist_ok=True)
scenes, uploads = [], []
legacy_file = out/'legacy.json'
legacy = json.loads(legacy_file.read_text()) if legacy_file.exists() else {}

def asset(file, key):
    body = file.read_bytes()
    sha = hashlib.sha256(body).hexdigest()
    path = key + '-' + sha[:16] + file.suffix.lower()
    uploads.append(dict(source=str(file), path=path, bytes=len(body), sha256=sha,
                        md5=hashlib.md5(body).hexdigest(), contentType='image/svg+xml' if file.suffix=='.svg' else 'image/png'))
    return path

for level, folder, pattern in [('middle','场景词汇海报','M*/M*_互动数据.json'), ('senior','高中场景互动图片_2026-11-05','G*/G*_互动数据.json')]:
    for file in sorted((source/folder).glob(pattern)):
        d = json.loads(file.read_text())
        sid = level + '-' + (d.get('source_scene_id') or d['group_id'])
        image = (file.parent/d['image']).resolve()
        assert image.is_relative_to(source)
        glossary = [w['glossary_rect'] for w in d['words']]
        left, top = min(r[0] for r in glossary), min(r[1] for r in glossary)
        right, bottom = max(r[0]+r[2] for r in glossary), max(r[1]+r[3] for r in glossary)
        footer = d.get('glossary_surface_rect', [left-.004, top-.003, right-left+.008, bottom-top+.006])
        scene = dict(id=sid, level=level, title=d['title_chinese'].removesuffix('核心词汇'),
                     titleEnglish=d['title_english'], titleChinese=d['title_chinese'],
                     bakedTitle=d.get('title_baked_in_image',False), titleRect=d['title_rect'],
                     imageWidth=d['image_width'], imageHeight=d['image_height'],
                     imagePath=asset(image,'v1/'+level+'/'+(d.get('source_scene_id') or d['group_id'])),
                     footerRect=footer, footerRows=d.get('glossary_rows',5),
                     columnCounts=d.get('glossary_column_counts'), words=[])
        for w in d['words']:
            scene['words'].append(dict(id=str(w['id']), english=w['english'], ipa=w.get('display_ipa',w['ipa']),
                definition=w.get('display_chinese',w['chinese']), fullIpa=w['ipa'], fullDefinition=w['chinese'],
                pos=w['pos'], sourceWord=w['source_word'], sourceIds=w.get('source_ids',[w['id']]),
                audioWord=w['english'].split('/')[0].strip(), aliases=w.get('aliases',[]),
                cardRect=w['card_rect'], illustrationRect=w['illustration_rect'], glossaryRect=w['glossary_rect'],
                opaqueFrame=bool(w.get('extra_frame')), leaderPoints=w.get('leader_points')))
        assert len({w['id'] for w in scene['words']})==len(scene['words'])
        (out/(sid+'.json')).write_text(json.dumps(scene,ensure_ascii=False,separators=(',',':'))+'\n')
        scenes.append({k:scene[k] for k in ['id','level','title']} | {'wordCount':len(scene['words'])})

for file in sorted((root/'src/data/vocabulary-scene-images').rglob('*')):
    if not file.is_file(): continue
    relative = file.relative_to(root/'src/data/vocabulary-scene-images').as_posix()
    # The deleted public asset must match the migration source exactly.
    old = subprocess.run(['git','show','HEAD:public/vocabulary-stories/'+relative],cwd=root,capture_output=True)
    assert old.returncode==0 and old.stdout==file.read_bytes(), relative
    legacy[relative] = asset(file,'legacy/'+relative.rsplit('.',1)[0])

assert sum(s['level']=='middle' for s in scenes)==80
assert sum(s['level']=='senior' for s in scenes)==155
assert sum(s['wordCount'] for s in scenes)==4699
(out/'index.json').write_text(json.dumps(scenes,ensure_ascii=False,separators=(',',':'))+'\n')
(out/'legacy.json').write_text(json.dumps(legacy,ensure_ascii=False,indent=2)+'\n')
Path(a.plan).write_text(json.dumps(uploads,ensure_ascii=False,indent=2))
print(json.dumps({'scenes':len(scenes),'cards':4699,'legacy_assets':len(legacy),'upload_MB':round(sum(x['bytes'] for x in uploads)/1e6,1)}))

"""Assemble reviewed papers and source-faithful legacy question families."""
import argparse
import collections
import copy
import datetime
import hashlib
import json
import re
import subprocess
from pathlib import Path

from cet4_source_common import digest, source_ref

parser = argparse.ArgumentParser()
parser.add_argument('--cache',type=Path,required=True)
parser.add_argument('--check',action='store_true')
args = parser.parse_args()
cache = args.cache


def read_sets(folder):
    return [json.loads(path.read_text()) for path in sorted((cache/folder).glob('*.json')) if not path.name.startswith('.')]


modern = read_sets('reviewed-papers')
for paper in modern:
    count=sum(len(group['questions'])for section in paper['sections']for group in section['groups'])
    paper['timeLimit']={2:60,32:100,57:125}[count]
legacy_images = read_sets('reviewed-legacy-papers')
legacy_pdf = read_sets('reviewed-legacy-pdf')
typed = json.loads((cache/'legacy-reviewed-sets.json').read_text())
text_reviews=json.loads(Path('src/data/cet4/source-text-review.json').read_text())
if len(modern)!=46 or len(legacy_images)!=30:
    raise ValueError('The 46 modern and 30 legacy paper checkpoints are not complete')
for filename in ['modern-review-pending.json','legacy-modern-review-pending.json']:
    if json.loads((cache/filename).read_text()):
        raise ValueError(f'Unresolved paper review: {filename}')

families = ['听力理解','听写填空','选词填空','长篇阅读','仔细阅读','完形填空','词汇与语法','翻译','写作']
slugs = ['listening','dictation','word-bank','matching','reading','cloze','grammar','translation','writing']
sections = collections.defaultdict(list)
assets = {}
covered = collections.defaultdict(set)
dedup = set()


def category_for(group):
    labels = {q.get('typeLabel','') for q in group['questions']}
    if labels <= {'短篇新闻','长对话','听力篇章','听力理解'}:return '听力理解'
    if labels <= {'长篇阅读判断','长篇阅读'}:return '长篇阅读'
    if len(labels)==1 and next(iter(labels)) in families:return next(iter(labels))
    raise ValueError(f'Unclassified actual response format: {labels}')


def canonical_source(dataset,question):
    match = re.search(r'cet4-legacy-(?:pdf-)?(\d{6}-[123](?:-new|-b)?)',question['id'])
    if match:return match[1]
    if dataset['id'].startswith('cet4-paper-'):
        return dataset['id'][-7:-1]+'-'+dataset['id'][-1]
    return 'special'


def add_groups(dataset,is_image):
    for asset in dataset['assetRefs']:
        assets[asset['assetId']] = asset
    for section in dataset['sections']:
        for group in section['groups']:
            category = category_for(group)
            source_key = canonical_source(dataset,group['questions'][0])
            numbers = {q.get('sourceQuestionNumber',q['displayNumber']) for q in group['questions']}
            coverage_key = (source_key,category)
            if not is_image:
                # Post-2013 merged documents contain misdated writing and mixed
                # answer tails. The independently paired original PDFs take priority.
                if source_key!='special' and source_key[:6]>='201312' and '-pdf-' not in group['id'] and source_key[:6]<'201600':
                    continue
                if source_key!='special' and any(len({ref['sha256']for ref in question['sourceRefs']})>1 and not question.get('answerAlignmentProof')for question in group['questions']):
                    continue
                if covered[coverage_key] & numbers:
                    continue
            fingerprint = (source_key,category,tuple(sorted(numbers)))
            if source_key!='special' and fingerprint in dedup:
                continue
            dedup.add(fingerprint)
            copied = copy.deepcopy(section)
            copied['groups'] = [copy.deepcopy(group)]
            copied['sourceYear'] = section.get('sourceYear') or dataset['year']
            if dataset['kind']=='paper':
                copied['title'] = dataset['title']+' · '+category
                copied['groups'][0]['title'] = copied['title']
                if dataset.get('coverageNote'):
                    copied['instructions'].append({'type':'notice','tone':'info','text':dataset['coverageNote']})
                # Listening audio is attached at section level in the paper.
                # Keep it available when that section becomes a practice group.
                audio = next((a for a in dataset['assetRefs'] if a['kind']=='audio'),None)
                if category=='听力理解' and audio and not any(b.get('type')=='audio' for b in copied['instructions']):
                    copied['instructions'].append({'type':'audio','assetId':audio['assetId'],'label':'原卷听力音频'})
            for question in copied['groups'][0]['questions']:
                question.pop('displayLabel',None)
                if question['type']=='essay':
                    question.pop('sourceQuestionNumber',None)
                    question.pop('sourceQuestionLabel',None)
                for edit in text_reviews.get('legacyPromptCorrections',[]):
                    if edit['questionId']!=question['id']:continue
                    if question['sourceRefs'][0]['sha256']!=edit['sourceHash']:raise ValueError('Writing correction source changed')
                    blocks=question['promptBlocks']if edit['field']=='promptBlocks'else question['answerSpec']['referenceAnswer']
                    found=False
                    for block in blocks:
                        for run in block.get('runs',[]):
                            if run.get('text')==edit['before']:
                                run['text']=edit['after'];found=True
                    if not found:raise ValueError('Writing correction no longer matches')
            sections[category].append(copied)
            if is_image:
                covered[coverage_key].update(numbers)


for dataset in legacy_pdf:add_groups(dataset,True)
for dataset in legacy_images:add_groups(dataset,True)
for dataset in typed:add_groups(dataset,False)


def asset_ids(value):
    result=set()
    def visit(item):
        if isinstance(item,dict):
            if 'assetId' in item:result.add(item['assetId'])
            for child in item.values():visit(child)
        elif isinstance(item,list):
            for child in item:visit(child)
    visit(value)
    return result


practice=[]
for category,slug in zip(families,slugs):
    parts=sections[category]
    if not parts:raise ValueError(f'No reviewed exercises for {category}')
    parts.sort(key=lambda section:(section['sourceYear'],section['title']),reverse=True)
    sequence=0
    for section in parts:
        for group in section['groups']:
            for question in group['questions']:
                sequence+=1
                question['displayNumber']=sequence
    used=asset_ids(parts)
    refs={ref['sha256']:ref for section in parts for group in section['groups'] for q in group['questions'] for ref in q['sourceRefs']}
    practice.append({'schemaVersion':2,'id':'practice-cet4-'+slug,'kind':'practice',
                     'title':'大学英语四级'+category+'训练','year':'1990–2019','region':'全国','variant':'',
                     'coverageNote':'仅开放已核对题组；缺答案或对应关系不明的资料待复核',
                     'instructions':[{'type':'notice','tone':'info','text':'按来源年份选择练习，题目保留原题号。仅开放已核对题组，其余资料继续复核。'}],
                     'sections':parts,'assetRefs':[assets[aid]for aid in sorted(used)],'sourceRefs':list(refs.values()),
                     'quality':{'structureStatus':'approved','structureConfidence':1,'issueCount':0,'issues':[]}})

sets=modern+practice
year_counts=collections.Counter(section['sourceYear']for dataset in practice for section in dataset['sections']for group in section['groups']for _ in group['questions'])
missing_years=set(str(year)for year in range(1990,2020))-set(year_counts)
print(json.dumps({'legacyYears':sorted(year_counts),'missingLegacyYears':sorted(missing_years),
                  'categories':{dataset['id']:sum(len(g['questions'])for s in dataset['sections']for g in s['groups'])for dataset in practice}},ensure_ascii=False),flush=True)
if missing_years:raise ValueError('Legacy year coverage is incomplete')
if args.check:raise SystemExit(0)
# Strip publisher metadata from every exposed recording. Re-encode only speech
# tracks above 64 kb/s; retain the source hash and verify duration after encoding.
media_path=cache/'audio-cleaning.json'
media=json.loads(media_path.read_text())if media_path.exists()else{}
audio_by_url={a['url']:a for dataset in sets for a in dataset['assetRefs']if a['kind']=='audio'}
for url,asset in sorted(audio_by_url.items()):
    path=Path('public'+url)
    sha=digest(path)
    prior=media.get(url)
    if not prior or prior['sha256']!=sha:
        info=json.loads(subprocess.run(['ffprobe','-v','error','-show_format','-show_streams','-of','json',str(path)],check=True,capture_output=True,text=True).stdout)
        duration=float(info['format']['duration'])
        stream=next(s for s in info['streams']if s['codec_type']=='audio')
        bitrate=int(stream.get('bit_rate') or info['format'].get('bit_rate') or 128000)
        target=path.with_name(path.stem+'.clean.mp3')
        codec=['-c:a','libmp3lame','-b:a','64k','-ac','1','-ar','22050']if bitrate>68000 else ['-c:a','copy']
        command=['ffmpeg','-v','error','-nostdin','-y','-i',str(path),'-map','0:a:0',*codec,'-map_metadata','-1','-id3v2_version','0','-write_id3v1','0',str(target)]
        subprocess.run(command,check=True,capture_output=True)
        check=json.loads(subprocess.run(['ffprobe','-v','error','-show_format','-of','json',str(target)],check=True,capture_output=True,text=True).stdout)
        copied=False
        if abs(float(check['format']['duration'])-duration)>.3:
            # Some source MP3s carry inconsistent duration headers. Preserve
            # their encoded audio packets exactly instead of re-encoding.
            subprocess.run(['ffmpeg','-v','error','-nostdin','-y','-i',str(path),'-map','0:a:0','-c:a','copy','-map_metadata','-1','-id3v2_version','0','-write_id3v1','0',str(target)],check=True,capture_output=True)
            def packets(filename):
                data=json.loads(subprocess.run(['ffprobe','-v','error','-select_streams','a:0','-show_packets','-show_entries','packet=data_hash','-show_data_hash','sha256','-of','json',str(filename)],check=True,capture_output=True,text=True).stdout)
                return [packet['data_hash']for packet in data['packets']]
            if packets(path)!=packets(target):
                target.unlink();raise ValueError(f'Audio packets changed: {url}')
            check=json.loads(subprocess.run(['ffprobe','-v','error','-show_format','-of','json',str(target)],check=True,capture_output=True,text=True).stdout)
            duration=float(check['format']['duration'])
            copied=True
        target.replace(path)
        media[url]={'sourceSha256':sha,'sha256':digest(path),'duration':duration,'bitrate':bitrate if copied else min(bitrate,64000),
                    'method':'speech-64k-mono'if bitrate>68000 and not copied else 'metadata-removal'}
        media_path.write_text(json.dumps(media,ensure_ascii=False,indent=2)+'\n')
        print('CLEANED AUDIO '+url,flush=True)
for dataset in sets:
    dataset.pop('sourceReviewVersion',None)
    for asset in dataset['assetRefs']:
        if asset['kind']=='audio':
            record=media[asset['url']]
            asset['sha256']=record['sha256']
            asset['sourceRefs']=[source_ref('四级原卷听力音频',record['sourceSha256'],method='media-manifest')]
            asset['duration']=record['duration']
    used=asset_ids(dataset['sections'])
    dataset['assetRefs']=[asset for asset in dataset['assetRefs']if asset['assetId']in used]

cleaned={}
for path in (cache/'cleaned-images').glob('*.json'):
    if not path.name.startswith('.'):
        record=json.loads(path.read_text())
        if record.get('passed'):cleaned[record['sha256']]=record
images={asset['sha256']for dataset in sets for asset in dataset['assetRefs']if asset['kind']=='image'}
if images-set(cleaned):raise ValueError('Some published images lack an independent residue check')
manifest={'reviewedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),
          'cleanedImageHashes':sorted(images),'legacyQuestionsByYear':dict(sorted(year_counts.items())),
          'sets':sets}
Path('src/data/cet4/source-review.json').write_text(json.dumps(manifest,ensure_ascii=False)+'\n')
print(json.dumps({'papers':len(modern),'practiceCategories':len(practice),
                  'practiceQuestions':sum(len(g['questions'])for dataset in practice for s in dataset['sections']for g in s['groups']),
                  'years':dict(sorted(year_counts.items()))},ensure_ascii=False),flush=True)

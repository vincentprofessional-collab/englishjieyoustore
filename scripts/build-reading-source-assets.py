"""Render only whitelisted, checked exam pages and emit the site's source-backed model."""
import argparse
import hashlib
import importlib.machinery
import json
from pathlib import Path
import re

import fitz
from PIL import Image, ImageChops

PROMO = re.compile(r"公众号|淘宝|微信|微博|二维码|练习方式|topsage|ieltsbro|laokaoya|小站雅思|雅思哥", re.I)
KEY_FURNITURE = re.compile(r"resource\s*bank|extra\s+explanations|If\s+you\s+score", re.I)
RECIPE = "source-pages-v3"


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", required=True)
    parser.add_argument("--repo", default=".")
    parser.add_argument("--render", action="store_true")
    parser.add_argument("--only-passages", action="store_true")
    parser.add_argument("--state-root", help="Writable active-workspace checkpoints; source caches remain read-only")
    args = parser.parse_args()
    root, repo = Path(args.root), Path(args.repo).resolve()
    state=Path(args.state_root).resolve() if args.state_root else root
    state.mkdir(parents=True,exist_ok=True)
    manifest = json.loads((root / "source-manifest.json").read_text())
    manifest['books'] = [book for book in manifest['books'] if 4 <= int(book['book']) <= 21]
    tests = json.loads(((state if (state/'reading-page-map.json').exists() else root) / "reading-page-map.json").read_text())
    tests = [test for test in tests if 4 <= int(test['book']) <= 21]
    evidence = {row["id"]: row for row in json.loads((root / "answer-evidence.json").read_text())}
    local_plan=state/'reading-image-safety-plan.json'
    page_plan = json.loads((local_plan if local_plan.exists() else root / "reading-image-safety-plan.json").read_text())
    corrections_file = state / "answer-corrections.json"
    if not corrections_file.exists():corrections_file=repo/'scripts/data/reading-answer-corrections.json'
    corrections = json.loads(corrections_file.read_text()) if corrections_file.exists() else {}
    explanations_file=state/'explanations'/'site-explanations.json'
    explanations=json.loads(explanations_file.read_text()) if explanations_file.exists() else {}
    qr_file = root / "source-qr-audit.json"
    qr_audit = {(row['book'],row['page']):row['codes'] for row in json.loads(qr_file.read_text())} if qr_file.exists() else {}
    asset_dir, md_dir = repo / "public/reading/source-pages", repo / "public/reading/sources"
    asset_dir.mkdir(parents=True, exist_ok=True)
    md_dir.mkdir(parents=True, exist_ok=True)
    for path in asset_dir.glob('ci*-p*.webp'):
        if re.fullmatch(r'ci[123]-p\d{3}\.webp', path.name): path.unlink()
    for path in md_dir.glob('cambridge-*-test-*.md'):
        if re.fullmatch(r'cambridge-[123]-test-[1-4]\.md', path.name): path.unlink()
    index_file = state / "rendered-page-index.json"
    initial_index = index_file if index_file.exists() else root / 'rendered-page-index.json'
    index = json.loads(initial_index.read_text()) if initial_index.exists() else {}
    index = {key: value for key, value in index.items() if not re.fullmatch(r'ci[123]-p\d{3}', key)}
    pages_by_book = {}
    source_map = importlib.machinery.SourceFileLoader('reading_source_map', str(repo / 'scripts/ielts-source-map.py')).load_module()
    key_pages = {(test['book'],p) for test in tests for p in test['answerPages']}
    all_images = {}
    for book in manifest['books']:
        number = book['book']
        pages_by_book[number] = source_map.load_pages(root, book,state/'repaired-primary')
        with fitz.open(book['source']) as document:
            for no in page_plan[str(number)]:
                if (number, no) in key_pages and args.only_passages:
                    continue
                scan_file = root / "safety-scan" / f"ci{number}" / f"{no:03}.json"
                repaired_scan=state/'repaired-primary'/'safety-scan'/f'ci{number}'/f'{no:03}.json'
                if repaired_scan.exists():scan_file=repaired_scan
                if not scan_file.exists():
                    raise ValueError(f"CI{number} page {no} has not passed the upload-content scan")
                scan = json.loads(scan_file.read_text())
                page_key = f"ci{number}-p{no:03}"
                path = asset_dir / f"{page_key}.webp"
                recipe=RECIPE+'-rotated-key-v2' if (number,no) in key_pages else RECIPE
                if args.render and not (path.exists() and index.get(page_key, {}).get('sourceSha256') == book['sha256'] and index[page_key].get('recipe') == recipe):
                    page = document[no - 1]
                    groups = {}
                    for word in scan['words']:
                        groups.setdefault(tuple(word['line']), []).append(word)
                    removed = []
                    banners = []
                    cutoff = page.rect.height
                    def redact(rect):
                        # OCR coordinates follow the displayed page; PDF annotations use its
                        # unrotated coordinate system. This matters for Cambridge 20/21 scans.
                        page.add_redact_annot(fitz.Rect(rect) * page.derotation_matrix,fill=(1,1,1))
                    if (number,no) in key_pages:
                        vision_file = root / 'vision-keys' / f'ci{number}' / f'{no:03}.json'
                        if vision_file.exists():
                            vision = json.loads(vision_file.read_text())
                            for line in vision['lines']:
                                compact=re.sub(r'[^a-z]','',line['text'].lower())
                                if re.search(r'(?:If|lf|1f)\s*y\s*o\s*u',line['text'],re.I) or 'youscore' in compact:
                                    cutoff = min(cutoff,line['y']/vision['height']*page.rect.height-3)
                                elif re.match(r'^0\s*[-–—]\s*\d{1,2}\b',line['text']):
                                    cutoff = min(cutoff,(line['y']/vision['height']-.035)*page.rect.height)
                                elif KEY_FURNITURE.search(line['text']):
                                    banners.append(fitz.Rect(line['x']/vision['width']*page.rect.width,line['y']/vision['height']*page.rect.height,(line['x']+line['w'])/vision['width']*page.rect.width,(line['y']+line['h'])/vision['height']*page.rect.height))
                    for words in groups.values():
                        text = ' '.join(w['text'] for w in words)
                        if (number,no) in key_pages and re.match(r'^0\s*[-–—]\s*\d{1,2}\b',text):
                            cutoff=min(cutoff,(min(w['y'] for w in words)/scan['height']-.035)*page.rect.height)
                        if PROMO.search(text) or (number,no) in key_pages and KEY_FURNITURE.search(text):
                            rect = fitz.Rect(min(w['x'] for w in words),min(w['y'] for w in words),max(w['x']+w['w'] for w in words),max(w['y']+w['h'] for w in words))
                            rect = fitz.Rect(rect.x0 / scan['width'] * page.rect.width,rect.y0 / scan['height'] * page.rect.height,rect.x1 / scan['width'] * page.rect.width,rect.y1 / scan['height'] * page.rect.height)
                            if re.search(r'If\s+you\s+score',text,re.I):
                                cutoff = min(cutoff, rect.y0 - 3)
                            elif KEY_FURNITURE.search(text):
                                banners.append(rect)
                            else:
                                redact(rect + (-3,-3,3,3))
                            removed.append(text)
                    if banners:
                        redact(fitz.Rect(0,min(r.y0 for r in banners)-9,page.rect.width,max(r.y1 for r in banners)+9))
                    for code in qr_audit.get((number,no),[]):
                        redact(fitz.Rect(code['rect']) + (-5,-5,5,5))
                        removed.append('QR code')
                    if page.annots():
                        page.apply_redactions(images=2)
                    clip = fitz.Rect(0,0,page.rect.width,cutoff)
                    pix = page.get_pixmap(matrix=fitz.Matrix(1750 / page.rect.width,1750 / page.rect.width),clip=clip,alpha=False)
                    image = Image.frombytes('RGB',(pix.width,pix.height),pix.samples)
                    bounds = ImageChops.difference(image,Image.new('RGB',image.size,'white')).convert('L').point(lambda v:255 if v>35 else 0).getbbox()
                    if bounds:
                        margin=24
                        image=image.crop((max(0,bounds[0]-margin),max(0,bounds[1]-margin),min(image.width,bounds[2]+margin),min(image.height,bounds[3]+margin)))
                    image.save(path,'WEBP',quality=92,method=6)
                    index[page_key] = {'sourceSha256':book['sha256'],'recipe':recipe,'page':no,'rotation':page.rotation,'width':image.width,'height':image.height,'removed':removed,'sha256':hashlib.sha256(path.read_bytes()).hexdigest()}
                    if len(index) % 25 == 0:
                        index_file.write_text(json.dumps(index,ensure_ascii=False))
                if page_key in index:
                    all_images[(number,no)] = {'page':no,'src':f'/reading/source-pages/{page_key}.webp','width':index[page_key]['width'],'height':index[page_key]['height']}
        index_file.write_text(json.dumps(index,ensure_ascii=False))
        print(f"CI{number}: {len(page_plan[str(number)])} original-page derivatives checkpointed",flush=True)
    site_tests = []
    pending = []
    for test in tests:
        if any(re.search(r'GENERAL\s*TRAINING',pages_by_book[test['book']][no],re.I) for no in test['answerPages']):
            raise ValueError(f"{test['id']}: a General Training key cannot grade this academic reading test")
        display_no=test['test']+4 if test['book']==12 else test['test']
        row = evidence[test['id']]
        answer_map = {int(n):{'values':a['values'],'mode':a['mode']} for n,a in row['answers'].items()}
        correction = corrections.get(test['id'],{})
        for number,answer in correction.get('answers',{}).items():
            answer_map[int(number)] = answer if isinstance(answer,dict) else {'values':[answer],'mode':'any'}
        groups = correction.get('groups', row['groups'])
        expected = {q for part in test['parts'] for q in range(part['firstQuestion'],part['lastQuestion']+1)}
        if correction.get('reviewed'):
            reviewed=correction.get('answers',{})
            if {int(n) for n in reviewed} != expected:
                raise ValueError(f"{test['id']}: the reviewed answer set does not match the original question ranges")
            answer_map={int(n):(a if isinstance(a,dict) else {'values':[a],'mode':'any'}) for n,a in reviewed.items()}
        for group in groups:
            if group['mode']=='unordered':
                for n in group['numbers']:
                    answer_map[n]={**answer_map[n],'values':group['values'],'mode':'unordered'}
        clean_images = all((test['book'],p) in all_images for part in test['parts'] for p in part['pages'])
        verified = bool(correction.get('reviewed') and expected == set(answer_map) and clean_images)
        flattened=[q for part in test['parts'] for q in range(part['firstQuestion'],part['lastQuestion']+1)]
        if flattened != list(range(1,max(expected)+1)):
            raise ValueError(f"{test['id']}: question ranges overlap or omit a printed number")
        if not verified:
            pending.append(test['id'])
        parts = []
        markdown = [f"# 剑桥雅思{test['book']} Test {display_no} Reading",'',f"来源：{Path(test['source']).name}",f"原PDF SHA256：{test['sourceSha256']}",'']
        for part in test['parts']:
            part_id=f"{test['id']}-part{part['number']}"
            analysis=explanations.get(part_id,{})
            # Keep every printed page in the original pane. Some papers place
            # heading questions before the article or mix them on the same page;
            # classifying by the first OCR heading can silently omit source ink.
            passage = [all_images[(test['book'],p)] for p in part['pages'] if (test['book'],p) in all_images]
            # A question table may continue on the following page without a new
            # "Questions" heading. Keep the entire sequence from its first page.
            first_heading=re.compile(rf'^\s*Questions?\s+{part["firstQuestion"]}(?!\d)',re.I|re.M)
            start=next((i for i,no in enumerate(part['pages']) if first_heading.search(pages_by_book[test['book']][no])),0)
            questions=[all_images[(test['book'],no)] for no in part['pages'][start:] if (test['book'],no) in all_images]
            numbers = list(range(part['firstQuestion'],part['lastQuestion']+1))
            answer_pages = [all_images[(test['book'],p)] for p in test['answerPages'] if (test['book'],p) in all_images]
            approved=analysis.get('reviewed') is True
            if approved:
                for n,explanation in analysis.get('answers',{}).items():
                    if int(n) not in numbers:raise ValueError(f'{part_id}: explanation outside printed question range')
                    answer_map[int(n)]={**answer_map[int(n)],'explanation':explanation}
            analysis_pages=analysis.get('pages',[]) if approved else []
            if any(not (repo/'public'/page['src'].lstrip('/')).exists() for page in analysis_pages):raise ValueError(f'{part_id}: missing approved explanation image')
            parts.append({'id':part_id,'label':f"Part {part['number']}",'title':f"Reading Passage {part['number']}",
                          'intro':f"Questions {numbers[0]}–{numbers[-1]}",'questionRange':f"questions {numbers[0]}–{numbers[-1]}",'sections':[],
                          'questionBlocks':[{'id':f"source-{part['number']}",'type':'fill','instruction':'','title':'','questions':[{'number':n,'before':f'Question {n}'} for n in numbers]}],
                          'source':{'passagePages':passage,'questionPages':questions,'answerPages':answer_pages,'explanationPages':analysis_pages,
                                    'analysisVerified':approved,'explanationAttribution':analysis.get('attribution','') if approved else ''}})
            markdown += [f"## Reading Passage {part['number']}（{numbers[0]}–{numbers[-1]}题）",'']
            source_numbers=sorted({page['page'] for page in passage+questions})
            markdown += [f"![原PDF第{p}页](/reading/source-pages/ci{test['book']}-p{p:03}.webp)\n" for p in source_numbers]
            if approved:
                markdown += ['<details>','<summary>本篇解析</summary>','',analysis['attribution'],'']
                markdown += [f"{n}. {analysis['answers'][str(n)]}" for n in numbers if str(n) in analysis.get('answers',{})]
                markdown += [f"![解析第{page['page']}页]({page['src']})\n" for page in analysis_pages]+['','</details>','']
        markdown += ['<details>','<summary>参考答案</summary>',''] + [f"{n}. {' / '.join(answer_map[n]['values'])}" for n in sorted(expected) if n in answer_map] + ['', '</details>', '']
        text = '\n'.join(markdown).replace('](/reading/','](https://www.englishjieyou.cn/reading/')
        if PROMO.search(text): raise ValueError('Promotional content in Markdown')
        (md_dir/f"{test['id']}.md").write_text(text)
        site_tests.append({'id':test['id'],'bookCode':f"cambridge-{test['book']}",'bookTitle':f"剑桥雅思 {test['book']}",'testNo':test['test'],
                           'displayTestNo':display_no,'title':f"剑桥雅思 {test['book']} Test {display_no} Reading",'parts':parts,
                           'source':{'verified':verified,'sanitized':clean_images,'pdfName':Path(test['source']).name,'sha256':test['sourceSha256'],'answers':answer_map,'groups':groups}})
    (repo/'src/lib/ielts/source-reading-tests.json').write_text(json.dumps(site_tests,ensure_ascii=False,separators=(',',':'))+'\n')
    (state/'answer-source-gate.json').write_text(json.dumps({'tests':len(site_tests),'renderedPages':len(index),'pending':pending},ensure_ascii=False,indent=2))
    missing_analysis=[p['id'] for t in site_tests for p in t['parts'] if explanations.get(p['id'],{}).get('reviewed') is not True]
    (state/'publication-gate.json').write_text(json.dumps({'tests':len(site_tests),'answerTestsReady':len(site_tests)-len(pending),'renderedPages':len(index),'answerPending':pending,'analysisPartsReady':len(site_tests)*3-len(missing_analysis),'analysisNotRequired':missing_analysis,'analysisRequired':False,'scope':'2026-10-22: retain completed analysis; do not author more','ready':not pending},ensure_ascii=False,indent=2))
    review={'tests':len(site_tests),'parts':sum(len(t['parts']) for t in site_tests),'questions':sum(len(t['source']['answers']) for t in site_tests),
            'papers':{t['id']:{'pdfName':Path(t['source']).name,'sourceSha256':t['sourceSha256'],
                               'parts':{f"{t['id']}-part{p['number']}":{'originalPages':p['pages'],'firstQuestion':p['firstQuestion'],'lastQuestion':p['lastQuestion']} for p in t['parts']}} for t in tests},
            'images':index}
    (repo/'docs/ielts-reading-source-review-20261022.json').write_text(json.dumps(review,ensure_ascii=False,indent=2))
    print('CONTENT GATE',len(site_tests)-len(pending),'ready;',len(pending),'pending')


if __name__ == '__main__':
    main()

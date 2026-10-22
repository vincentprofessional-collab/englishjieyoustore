"""Publish only matched reading-analysis pages, with source fingerprints and removed furniture."""
import argparse
from collections import Counter
import hashlib
import json
import math
from pathlib import Path
import re

import fitz
from PIL import Image

PROMO=re.compile(r'公众号|淘宝|(?:加|关注|联系).{0,8}微信|微信.{0,8}(?:扫一扫|扫码|号|联系)|微信[:：]|微博|二维码|topsage|foxit|PDF\s*Editor|仅\s*用\s*于\s*评\s*估|版权\s*所有|新东方|new\s*oriental|雅思哥|小站雅思|yasibox|laokaoya|ieltsbro',re.I)
ANALYSIS=re.compile(r'题目解析|答案解析|试题解析|题目详解|题目讲解|试题讲解|解题思路|题型解析')
STOP=set('the and that this with from which their they have been were when there these those would could should about reading passage questions question answers answer write your below following paragraph paragraphs people information more most into than some also such them what after other only each first second third true false given text words choose correct letter letters either order following number numbers test'.split())
START_OVERRIDES={'cambridge-9-test-3-part2':(118,.758)}
EXCLUDED_PARTS={'cambridge-11-test-1-part1','cambridge-11-test-1-part2','cambridge-11-test-3-part1','cambridge-11-test-3-part2','cambridge-11-test-4-part2','cambridge-11-test-4-part3'}


def tokens(text):return set(w.lower() for w in re.findall(r'[A-Za-z]{5,}',text) if w.lower() not in STOP)


def main():
    p=argparse.ArgumentParser();p.add_argument('--state-root',required=True);p.add_argument('--repo',default='.');p.add_argument('--render',action='store_true');args=p.parse_args()
    state=Path(args.state_root);root=state/'explanations';repo=Path(args.repo)
    chapters=json.loads((root/'chapter-map.json').read_text());sources={s['book']:s for s in json.loads((root/'source-manifest.json').read_text())['books']}
    tests={t['id']:t for t in json.loads((state/'reading-page-map.json').read_text())}
    primary={f"{t['id']}-part{part['number']}":tokens(part['text']) for t in tests.values() for part in t['parts']}
    frequencies={b:Counter(w for key,words in primary.items() if key.startswith(f'cambridge-{b}-') for w in words) for b in range(3,19)}
    # Unreviewed analysis derivatives stay outside public/ and cannot enter a deployment.
    public=root/'review-pages';public.mkdir(parents=True,exist_ok=True)
    index_file=root/'render-index.json';index=json.loads(index_file.read_text()) if index_file.exists() else {}
    output={};pending=[]
    for c in chapters:
        if c['book']<=8:pending.append({'id':c['id'],'reason':'watermark overlaps prose; image excluded'});continue
        if c['id'] in EXCLUDED_PARTS:pending.append({'id':c['id'],'reason':'QR overlaps prose; further analysis not required'});continue
        if c['status']!='chapter_mapped':pending.append({'id':c['id'],'reason':c['status']});continue
        scans={};invalid=False
        for page in c['scanPages']:
            f=root/'ocr'/f"ci{page['source']}"/f"{page['page']:03}.json"
            if not f.exists():invalid=True;break
            data=json.loads(f.read_text())
            if any('\n' in w['text'] or '\t' in w['text'] for w in data['words']):invalid=True;break
            scans[(page['source'],page['page'])]=data
        if invalid:pending.append({'id':c['id'],'reason':'incremental OCR repair pending'});continue
        explanation_tokens=tokens('\n'.join(d['text'] for d in scans.values()))
        evidence=sorted(primary[c['id']] & explanation_tokens,key=lambda w:(frequencies[c['book']][w],-len(w)))
        rare=[w for w in evidence if frequencies[c['book']][w]<=3]
        if len(rare)<2:pending.append({'id':c['id'],'reason':'chapter-to-passage evidence requires review','matches':rare});continue
        first=tests[c['id'].rsplit('-part',1)[0]]['parts'][c['part']-1]['firstQuestion']
        starts=[];first_starts=[];ends=[];all_lines=[]
        for item in c['scanPages']:
            scan=scans[(item['source'],item['page'])];groups={}
            for word in scan['words']:groups.setdefault(tuple(word['line']),[]).append(word)
            for words in groups.values():
                text=''.join(w['text'] for w in words)
                position=c['pages'].index(item);y=min(w['y'] for w in words)/scan['height']
                all_lines.append((position,y,text))
                if ANALYSIS.search(text):starts.append((position,item,y))
                if re.match(rf'^[^A-Za-z]*Questions?\s*{first}(?!\d)',text,re.I):first_starts.append((position,item,y))
                # "参考译文" also labels individual question cells. It is not a
                # safe end marker: cutting there would remove the later answers.
                if re.match(r'^WRITINGTASK',text,re.I):ends.append((position,y))
                if c['id']=='cambridge-3-test-3-part1' and '人种史馆藏品概况' in text:ends.append((position,y))
                if c['id']=='cambridge-3-test-3-part2' and '森林的奥秘' in text:ends.append((position,y))
        if first_starts:starts=first_starts
        if c['id'] in START_OVERRIDES:
            number,y=START_OVERRIDES[c['id']];item=next(p for p in c['pages'] if p['page']==number)
            starts=[(c['pages'].index(item),item,y)]
        if not starts:pending.append({'id':c['id'],'reason':'analysis heading requires review','matches':rare[:8]});continue
        position,start_page,top=min(starts,key=lambda x:(x[0],x[2]))
        end=min((end for end in ends if end>(position,top)),default=(len(c['pages'])-1,1))
        selected=c['pages'][position:end[0]+1]
        if end[1]<.04:selected=selected[:-1]
        # The inserted page is entirely a store/WeChat advertisement, not analysis.
        selected=[item for item in selected if (item['source'],item['page'])!=(10,113)]
        if any((page['source'],page['page']) not in scans for page in selected):pending.append({'id':c['id'],'reason':'analysis span requires more scan pages'});continue
        pages=[]
        for j,item in enumerate(selected):
            source=sources[item['source']];scan=scans[(item['source'],item['page'])]
            bottom=end[1] if c['pages'].index(item)==end[0] else 1
            word_lines={}
            for word in scan['words']:word_lines.setdefault(tuple(word['line']),[]).append(word)
            for words in word_lines.values():
                compact=''.join(w['text'] for w in words)
                y=min(w['y'] for w in words)/scan['height']
                footer_stub=3<=item['source']<=8 and re.fullmatch(r'\W*www\W*',compact,re.I)
                if y>.88 and (re.search(r'topsage|yasibox',compact,re.I) or footer_stub):bottom=min(bottom,y-.002)
            asset=f"{c['id']}-exp{item['source']}-p{item['page']:03}"
            path=public/f'{asset}.webp';fingerprint={**source['fingerprint'],'recipe':'analysis-v2-complete','top':top if j==0 else 0,'bottom':bottom}
            repair_body=(item['source'],item['page']) in {(12,154),(16,158),(18,40)} or item['source']==17
            if repair_body:fingerprint['promotionRepair']='preserve-prose-remove-overlay-v1'
            if args.render and not (path.exists() and index.get(asset,{}).get('fingerprint')==fingerprint):
                with fitz.open(source['source']) as doc:
                    page=doc[item['page']-1];removed=[]
                    if item['source']==17:
                        # The marketing banner is a separate PDF image layer.
                        # Removing that object preserves the underlying source ink.
                        for picture in page.get_images(full=True):
                            if picture[0] in (957,977,946):
                                page.delete_image(picture[0]);removed.append('separate marketing image layer')
                    for words in word_lines.values():
                        text=' '.join(w['text'] for w in words)
                        compact=re.sub(r'\s+','',text)
                        if item['source']==17 and re.search(r'微信|abckg',compact,re.I):continue
                        footer_stub=(3<=item['source']<=8 and min(w['y'] for w in words)/scan['height']>.92 and re.fullmatch(r'\W*www\W*',compact,re.I))
                        if PROMO.search(text) or PROMO.search(compact) or footer_stub:
                            rect=fitz.Rect(min(w['x'] for w in words)/scan['width']*page.rect.width,min(w['y'] for w in words)/scan['height']*page.rect.height,max(w['x']+w['w'] for w in words)/scan['width']*page.rect.width,max(w['y']+w['h'] for w in words)/scan['height']*page.rect.height)+(-3,-3,3,3)
                            page.add_redact_annot(rect*page.derotation_matrix,fill=(1,1,1));removed.append(text)
                    if page.annots():page.apply_redactions(images=2)
                    clip=fitz.Rect(0,max(0,top*page.rect.height-5) if j==0 else 0,page.rect.width,min(page.rect.height,bottom*page.rect.height-4) if bottom<1 else page.rect.height)
                    pix=page.get_pixmap(matrix=fitz.Matrix(1600/page.rect.width,1600/page.rect.width),clip=clip,alpha=False)
                    image=Image.frombytes('RGB',(pix.width,pix.height),pix.samples);image.save(path,'WEBP',quality=90,method=6)
                    index[asset]={'fingerprint':fingerprint,'removed':removed,'width':image.width,'height':image.height,'sha256':hashlib.sha256(path.read_bytes()).hexdigest()}
            if asset in index:pages.append({'page':item['page'],'src':f'/reading/explanations/{asset}.webp','width':index[asset]['width'],'height':index[asset]['height']})
        if len(pages)==len(selected) and selected:
            expected=set(range(first,tests[c['id'].rsplit('-part',1)[0]]['parts'][c['part']-1]['lastQuestion']+1))
            mentioned=set()
            for item in selected:
                for word in scans[(item['source'],item['page'])]['words']:
                    if re.fullmatch(r'\d{1,2}',word['text']):mentioned.add(int(word['text']))
            output[c['id']]={'pages':pages,'sourceName':Path(sources[selected[0]['source']]['source']).name,'matchedKeywords':rare[:8],
                             'firstQuestionHeading':bool(first_starts),'questionNumbersNotDetected':sorted(expected-mentioned),'status':'content_review_required'}
        else:pending.append({'id':c['id'],'reason':'sanitized images not rendered'})
        index_file.write_text(json.dumps(index,ensure_ascii=False))
    (root/'candidate-explanations.json').write_text(json.dumps(output,ensure_ascii=False,indent=2))
    (root/'explanation-gate.json').write_text(json.dumps({'candidateParts':len(output),'pending':pending},ensure_ascii=False,indent=2))
    print('Matched analysis candidates',len(output),'pending',len(pending))


if __name__=='__main__':main()

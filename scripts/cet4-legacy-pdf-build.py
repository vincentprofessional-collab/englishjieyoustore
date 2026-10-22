"""Keep original PDF typography for pre-2016 listening/reading exercises."""
import argparse
import hashlib
import json
import re
import unicodedata
from pathlib import Path

import fitz

from cet4_source_common import EvidenceRenderer, NORMALIZATION, SOURCE_ROOT, choice_question, digest, option, paragraphs, source_ref

parser = argparse.ArgumentParser()
parser.add_argument('--cache', type=Path, required=True)
args = parser.parse_args()
selected = json.loads((args.cache/'legacy-selected.json').read_text())
renderer = EvidenceRenderer(args.cache)
output_dir = args.cache/'reviewed-legacy-pdf'
output_dir.mkdir(exist_ok=True)
pending = []
proofs = []
RECORD = re.compile(r'^\s*(\d{1,3})\s*[.．、)]\s*([^\n]*)',re.M)
OPTION = re.compile(r'(?<!\S)(?:[\[(]\s*([A-O])\s*[\])]|([A-O])\s*[).．])\s*')


def records(text):
    matches=list(RECORD.finditer(text))
    return [(m[1],text[m.start()+len(m[0])-len(m[2]):matches[i+1].start()if i+1<len(matches)else len(text)])for i,m in enumerate(matches)]


def choice_options(text):
    text=re.split(r'\n\s*(?:Questions?\s+\d|Section\s+[ABC]|Passage\s+)',text,maxsplit=1,flags=re.I)[0]
    text=re.sub(r'\n\s*[A-O][)）.。]*\s*$','',text)
    markers=list(OPTION.finditer(text))
    if {m[1]or m[2]for m in markers}!=set('ABCD'):return {}
    values={}
    for i,match in enumerate(markers):
        value=text[match.end():markers[i+1].start()if i+1<len(markers)else len(text)].strip()
        if not re.match('[A-Za-z0-9]',value):continue
        label=match[1]or match[2]
        if label in values:return {}
        values[label]=value
    return values if set(values)==set('ABCD')else{}


def normalized(text):
    return re.sub('[^a-z0-9]','',text.lower())


def raw_sections(text):
    markers=list(re.finditer(r'^\s*Section\s+([ABC])\b[^\n]*$',text,re.I|re.M))
    return {m[1].lower():text[m.end():markers[i+1].start()if i+1<len(markers)else len(text)]for i,m in enumerate(markers)}


def prove_key(source,section,number,format,answer):
    """A matching date is insufficient when publishers shuffle option order."""
    qtext=raw_sections(source['body']).get(section,'')
    arecords=[record for n,record in records(source['answers'])if n==str(number)]
    if format=='bank':
        bank={m[1]or m[2]:re.match(r"[A-Za-z]+(?:[-’'][A-Za-z]+)*",qtext[m.end():])[0]
              for m in OPTION.finditer(qtext)if re.match('[A-Za-z]',qtext[m.end():])}
        found=[]
        for record in arecords:
            match=re.match(r'^\s*[A-O]\s*[).]?\s*([A-Za-z]+(?:[-’\'][A-Za-z]+)*)',record)
            if match:found.extend(letter for letter,word in bank.items()if normalized(word)==normalized(match[1]))
        if len(set(found))==1:return found[0],'selected-answer-word'
    if format=='choice':
        question=next((record for n,record in records(qtext)if n==str(number)and choice_options(record)),None)
        if not question:return None
        qopts=choice_options(question)
        for record in arecords:
            aopts=choice_options(re.split(r'【预测】|【精析】|【详解】|【解析】',record)[0])
            if aopts and answer in aopts:
                found=[letter for letter,text in qopts.items()if normalized(text)==normalized(aopts[answer])]
                if len(found)==1:return found[0],'selected-option-text'
            if set('ABCD')<={m[1]or m[2]for m in OPTION.finditer(record)}:
                continue
            match=re.match(r'^\s*'+re.escape(answer)+r'\s*[).]\s*([^\n【]+)',record)
            if match:
                found=[letter for letter,text in qopts.items()if normalized(text)==normalized(match[1])]
                if len(found)==1:return found[0],'selected-option-text'
    return None


def load_source(relative, sha, channel, answer=False):
    if relative in renderer.docs:
        return renderer.docs[relative]
    path = args.cache/'ocr'/f'{sha}.json'
    if path.exists():
        doc = json.loads(path.read_text())
    else:
        pdf = fitz.open(SOURCE_ROOT/relative)
        pages = []
        for number, page in enumerate(pdf, 1):
            lines = []
            for block in page.get_text('dict')['blocks']:
                for line in block.get('lines', []):
                    text = unicodedata.normalize('NFKC',''.join(span['text'] for span in line['spans']))
                    x0,y0,x1,y1 = line['bbox']
                    lines.append({'text':text,'x':x0/page.rect.width,'y':y0/page.rect.height,
                                  'w':(x1-x0)/page.rect.width,'h':(y1-y0)/page.rect.height,'confidence':1})
            pages.append({'number':number,'width':page.rect.width,'height':page.rect.height,
                          'pdfText':page.get_text(),'lines':lines})
        doc = {'source':relative,'sha256':sha,'method':'pdf-native-text','pages':pages}
        path.write_text(json.dumps(doc,ensure_ascii=False)+'\n')
    points = []
    for page in doc['pages']:
        for line in sorted(page['lines'],key=lambda l:(round(l['y'],3),l['x'])):
            match = re.fullmatch(r'\s*Section\s*[\[（(]?\s*([ABC])\s*[\]）)]?\s*',line['text'],re.I)
            if match:
                point = {'kind':f'{channel}-{match[1].lower()}','page':page['number'],'y':max(.025,line['y']-.012)}
                if not points or points[-1]['kind'] != point['kind']:
                    points.append(point)
    if answer and (not points or points[0]['kind'] != f'{channel}-a'):
        points.insert(0,{'kind':f'{channel}-a','page':1,'y':.025})
    doc['segments'] = {}
    for i,point in enumerate(points):
        if point['kind'] in doc['segments']:
            raise ValueError('Repeated original PDF section requires review')
        doc['segments'][point['kind']] = {'start':point,'end':points[i+1] if i+1<len(points) else {'page':len(doc['pages']),'y':.945}}
    if not doc['segments']:
        raise ValueError('Original PDF section letters not established')
    renderer.docs[relative] = doc
    return doc


def assets_used(sections):
    ids = set()
    def visit(value):
        if isinstance(value,dict):
            if 'assetId' in value: ids.add(value['assetId'])
            for child in value.values():visit(child)
        elif isinstance(value,list):
            for child in value:visit(child)
    visit(sections)
    return [renderer.assets[aid] for aid in sorted(ids)]


for key, source in sorted(selected.items()):
    if not source.get('pairedPiece'):
        continue
    channel = 'listening' if key.endswith('-listening') else 'reading'
    keys = source.get('answerKeys',{})
    version = hashlib.sha256(json.dumps({'keys':keys,'source':source['sha256'],'answer':source['answerSourceHash'],'version':4},sort_keys=True).encode()).hexdigest()
    destination = output_dir/f'{key}.json'
    if destination.exists():
        cached = json.loads(destination.read_text())
        if cached.get('sourceReviewVersion') == version and all(Path('public'+a['url']).exists() and digest(Path('public'+a['url']))==a['sha256'] for a in cached['assetRefs']):
            continue
        destination.unlink()
    try:
        qdoc = load_source(source['source'],source['sha256'],channel)
        adoc = load_source(source['answerSource'],source['answerSourceHash'],channel,True)
        base = key[:8]
        label = f'{key[:4]}年{int(key[4:6])}月大学英语四级 · 第{key[7]}套'
        ref = source_ref(label,qdoc['sha256'],method=qdoc.get('method','pdf-ocr'))
        aref = source_ref(label+'解析',adoc['sha256'],method=adoc.get('method','pdf-ocr'))
        raw=raw_sections(source['body'])
        if channel == 'reading':
            is_matching=bool(re.search(r'ten\s+statements|Each\s+statement',raw.get('b',''),re.I))
            specs = [('a','选词填空',range(36,46),'bank'),('b','长篇阅读',range(46,56),'matching'),('c','仔细阅读',range(56,66),'choice')] if is_matching else [('a','选词填空',range(47,57),'bank'),('b','仔细阅读',range(57,67),'choice')]
        else:
            first_numbers=[int(n)for n,_ in records(raw.get('a',''))]
            if not first_numbers:raise ValueError('Actual listening question numbering not established')
            specs = [('a','听力理解',range(1,16),'choice'),('b','听力理解',range(16,26),'choice'),('c','听写填空',range(26,36),'dictation')] if min(first_numbers)==1 else [('a','听力理解',range(11,26),'choice'),('b','听力理解',range(26,36),'choice'),('c','听写填空',range(36,47),'dictation')]
        audio = None
        if channel == 'listening':
            url = f'/cet4/audio/cet4-legacy-{base}.mp3'
            path = Path('public'+url)
            if not path.exists():
                raise ValueError('Complete corresponding recording not established')
            sha = digest(path)
            audio = {'assetId':f'cet4-legacy-{base}-audio','kind':'audio','url':url,'mimeType':'audio/mpeg','sha256':sha,
                     'sourceRefs':[source_ref(label+'听力',sha,method='media-manifest')]}
            renderer.assets[audio['assetId']] = audio
        sections = []
        for suffix,category,numbers,format in specs:
            kind = f'{channel}-{suffix}'
            if kind not in qdoc['segments']:
                continue
            text = renderer.segment_text(qdoc,kind)
            if format == 'bank' and re.search(r'short\s+answer|answer\s+the\s+questions',text,re.I) and not re.search(r'word\s+bank|ten\s+blanks',text,re.I):
                pending.append({'source':key,'section':kind,'reason':'非词库短答格式由文字通道单独核验'})
                continue
            missing = [n for n in numbers if str(n) not in keys]
            if missing:
                pending.append({'source':key,'section':kind,'reason':f'标准答案待确认 {missing}'})
                continue
            if format != 'dictation' and any(not re.fullmatch('[A-O]',keys[str(n)]) for n in numbers):
                pending.append({'source':key,'section':kind,'reason':'客观题答案标记待确认'})
                continue
            if format == 'dictation' and any(re.search(r'[\u4e00-\u9fff]|【|[?？]',keys[str(n)]) or not re.search('[A-Za-z]{2}',keys[str(n)]) for n in numbers):
                pending.append({'source':key,'section':kind,'reason':'听写答案含题文或讲解，不能用作标准答案'})
                continue
            verified={n:prove_key(source,suffix,n,format,keys[str(n)])for n in numbers}
            if format in ['bank','choice'] and not all(verified.values()):
                pending.append({'source':key,'section':kind,'reason':'原卷选项与解析的答案文字尚未逐题对应，整组暂存'})
                continue
            if format in ['matching','dictation']:
                pending.append({'source':key,'section':kind,'reason':'解析册与原卷的段落/听写序号仍待逐项确认，整组暂存'})
                continue
            bank = []
            if format == 'bank':
                labels = set(re.findall(r'(?<![A-Za-z0-9])(?:[\[(]\s*)?([A-O])\s*[)\].]\s*[A-Za-z]',text))
                if labels != set('ABCDEFGHIJKLMNO'):
                    pending.append({'source':key,'section':kind,'reason':'原卷十五项词库标签待确认'})
                    continue
                bank = [option(letter) for letter in 'ABCDEFGHIJKLMNO']
            if format == 'matching':
                labels = re.findall(r'^\s*[\[（(【]?\s*([A-P])\s*[\]）).．】]',text,re.M)
                if not labels or set(labels)!={chr(n) for n in range(65,ord(max(labels))+1)}:
                    pending.append({'source':key,'section':kind,'reason':'原卷段落标签待确认'})
                    continue
                bank = [option(chr(n),chr(n)+' 段') for n in range(65,ord(max(labels))+1)]
            questions = []
            prefix = 'cet4-legacy-pdf-'+key+'-'+suffix
            for n in numbers:
                answer = verified[n][0] if verified.get(n) else keys[str(n)]
                q = choice_question(prefix,n,answer,ref,category,format in ['bank','matching'])
                q['sourceRefs'].append(aref)
                if verified.get(n):
                    q['answerAlignmentProof']={'method':verified[n][1],'questionSourceHash':qdoc['sha256'],'answerSourceHash':adoc['sha256']}
                    proofs.append({'source':key,'number':n,**q['answerAlignmentProof']})
                    if answer!=keys[str(n)]:q['explanationBlocks']=[{'type':'notice','tone':'info','text':'原解析采用不同选项顺序，本页答案已按选项文字对应。'}]
                if format == 'dictation':
                    blank = q['id']+'-blank'
                    q.update({'type':'inline_fill','options':[],'blanks':[{'blankId':blank}],
                              'promptBlocks':[{'type':'paragraph','runs':[{'type':'blank','blankId':blank}]}],
                              'placement':{'kind':'inline','blankIds':[blank]},
                              'answerSpec':{'availability':'answered','gradingMode':'auto','kind':'per_blank','perBlankAnswers':{blank:[answer]},'normalization':NORMALIZATION}})
                    if len(answer.split())>5:
                        q['answerSpec'] = {'availability':'answered','gradingMode':'manual','kind':'reference','referenceAnswer':paragraphs(answer)}
                questions.append(q)
            stimulus = renderer.segment(source['source'],kind,label+' · '+category)
            akind = kind if kind in adoc['segments'] else next(iter(adoc['segments']))
            explanation = renderer.segment(source['answerSource'],akind,label+' · '+category+'解析')
            group = {'id':prefix+'-group','title':label+' · '+category,'presentation':'reading','instructions':[],
                     'stimulusBlocks':stimulus,'sharedOptions':bank,'sharedOptionsReusable':format=='matching',
                     'questions':questions,'explanationBlocks':explanation}
            sections.append({'id':prefix+'-section','title':group['title'],'sourceYear':key[:4],
                             'layout':'split','instructions':[],'groups':[group]})
        if not sections:
            continue
        if audio:
            sections[0]['instructions'].append({'type':'audio','assetId':audio['assetId'],'label':'原卷听力音频'})
        result = {'schemaVersion':2,'id':'cet4-legacy-pdf-'+key,'kind':'practice','title':label,'year':key[:4],
                  'region':'全国','variant':f'第{key[7]}套','instructions':[],'sections':sections,
                  'assetRefs':assets_used(sections),'sourceRefs':[ref,aref], 'sourceReviewVersion':version,
                  'quality':{'structureStatus':'approved','structureConfidence':1,'issueCount':0,'issues':[]}}
        reformatted=key[:6]<'201312' and ((channel=='listening' and min(first_numbers)==1) or (channel=='reading' and is_matching))
        if reformatted:
            result['coverageNote']='来源采用后期重排题号或题型，仅按题型资料练习，未作为该场完整原卷'
            for section in result['sections']:section['instructions'].append({'type':'notice','tone':'info','text':result['coverageNote']})
        destination.write_text(json.dumps(result,ensure_ascii=False)+'\n')
        print(f'REVIEWED {key}: {sum(len(g["questions"])for s in sections for g in s["groups"])} original-PDF questions',flush=True)
    except ValueError as error:
        pending.append({'source':key,'reason':str(error)})
        print(f'PENDING {key}: {error}',flush=True)
(args.cache/'legacy-pdf-review-pending.json').write_text(json.dumps(pending,ensure_ascii=False,indent=2)+'\n')
(args.cache/'legacy-pdf-key-proofs.json').write_text(json.dumps(proofs,ensure_ascii=False,indent=2)+'\n')

"""Compare independent on-device OCR with the printed answer table, retaining its geometry."""
import argparse
import json
from pathlib import Path
import re


def norm(text):
    text = text.translate(str.maketrans({'С':'C','А':'A','В':'B','Е':'E','Н':'H','К':'K','М':'M','О':'O','Т':'T','І':'I','і':'i'}))
    text = re.sub(r'\s+', ' ', text).strip(' .,:;_')
    if re.match(r'^(?:TRUE|FALSE|YES|NO|NOT GIVEN)\b',text,re.I):
        return re.match(r'^(TRUE|FALSE|YES|NO|NOT GIVEN)\b',text,re.I)[1].upper()
    # Book 3 prints the option text after the answer code; it is evidence, not part of the answer.
    match = re.match(r'^([A-K]|[ivx]+)\s*(?://|/\s*[Il]|[Il]\s*/|[Il]{2})\s*\S',text)
    if match: return match[1]
    return text


def parse(data, split):
    width,height = data['width'],data['height']
    lines = data['lines']
    stop = min((l['y'] for l in lines if re.search(r'If you score',l['text'],re.I)),default=height*.85)
    answers={}; groups=[]; notes=[]
    for col in [0,1]:
        selected=[l for l in lines if (l['x'] < width*split)==(col==0) and l['y']<stop]
        anchors=[]; spare=[]
        for line in selected:
            value=line['text'].strip()
            if re.search(r'Reading Passage|Questions?\s+\d|Each question|SP[EP]LLING|ANSWER|ACADEMIC|Resource Bank|score|explanations',value,re.I):continue
            m=re.match(r'^(\d{1,2})(?:\s*([&–—-])\s*(\d{1,2}))?\s*[.:,)]*\s*(.*)$',value)
            if m and 1<=int(m[1])<=41:
                n=int(m[1]); end=int(m[3]) if m[3] else n
                nums=list(range(n,end+1)) if m[2] in {'-','–','—'} else list(dict.fromkeys([n,end]))
                anchors.append({'numbers':nums,'values':[m[4]] if m[4] else [],'line':line,'evidence':[value]})
            elif value: spare.append(line)
        anchors.sort(key=lambda x:x['line']['y'])
        for line in spare:
            if not anchors:continue
            # A detached answer starts beside its question number; continuation follows it.
            cy=line['y']+line['h']/2
            closest=min(anchors,key=lambda a:abs(a['line']['y']+a['line']['h']/2-cy))
            d=cy-(closest['line']['y']+closest['line']['h']/2)
            if abs(d)<height*.012 and line['x']>closest['line']['x']+width*.01 and not closest['values']:
                closest['values'].append(line['text']);closest['evidence'].append(line['text'])
            else:
                previous=[a for a in anchors if a['line']['y']<=line['y']]
                if previous:
                    owner=previous[-1]
                    if line['x']>owner['line']['x']+width*.01 and line['y']-owner['line']['y']<height*.07:
                        owner['values'].append(line['text']);owner['evidence'].append(line['text'])
        for a in anchors:
            text=' '.join(a['values']);mode='any';values=[norm(text)]
            if re.search(r'IN\s+(?:EITHER|ANY)\s+ORDER',text,re.I):
                mode='unordered'
                values=[norm(v) for v in a['values'] if not re.search(r'ORDER',v,re.I)]
                if len(values)==1 and re.fullmatch(r'[A-Z](?:\s+[A-Z])+',values[0]):values=values[0].split()
            elif re.search(r'BOTH\s+REQUIRED',text,re.I):
                mode='all'; values=[norm(v) for v in a['values'] if not re.search(r'BOTH|REQUIRED|FOR ONE MARK',v,re.I)]
            if not any(values):continue
            result={'values':values,'mode':mode,'evidence':a['evidence'],'confidence':a['line']['confidence']}
            for n in a['numbers']: answers[n]=result
            if len(a['numbers'])>1:groups.append({'numbers':a['numbers'],'values':values,'mode':mode})
        notes += [l['text'] for l in selected if re.search(r'ORDER|REQUIRED',l['text'],re.I)]
    return answers,groups,notes


def main():
    parser=argparse.ArgumentParser();parser.add_argument('--root',required=True);args=parser.parse_args();root=Path(args.root)
    tests=json.loads((root/'reading-page-map.json').read_text()); previous={t['id']:t for t in json.loads((root/'answer-evidence.json').read_text())}
    results=[]
    for test in tests:
        if test['book']==1:continue
        path=root/'vision-keys'/f"ci{test['book']}"/f"{test['answerPages'][0]:03}.json"
        if not path.exists():continue
        split=json.loads((root/'key-columns-v2'/f"ci{test['book']}"/f"{test['answerPages'][0]:03}.json").read_text())['splitRatio']
        a,g,notes=parse(json.loads(path.read_text()),split)
        expected={n for p in test['parts'] for n in range(p['firstQuestion'],p['lastQuestion']+1)}
        results.append({'id':test['id'],'book':test['book'],'test':test['test'],'page':test['answerPages'][0], 'answers':a,'groups':g,'notes':notes,'missing':sorted(expected-a.keys())})
    (root/'vision-answer-evidence.json').write_text(json.dumps(results,ensure_ascii=False,indent=2))
    print('Vision answer evidence',len(results),'tests; missing',sum(len(t['missing']) for t in results))
    for t in results:print(t['id'],'M',t['missing'],'G',t['groups'],'Notes',t['notes'])


if __name__=='__main__':main()

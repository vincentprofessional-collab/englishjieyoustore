"""Recover native PDF answer tables by their printed columns, without reading page furniture."""
import argparse
import json
from pathlib import Path
import re
import statistics


def parse(text):
    kept=[]
    for line in text.splitlines():
        if 'youscore' in re.sub(r'[^a-z]','',line.lower()):break
        kept.append(line)
    text='\n'.join(kept)
    positions=[m.start(1) for line in text.splitlines() for m in re.finditer(r'(?<!\S)(2[1-9]|3\d|40)(?:\s*&\s*\d+)?\s+',line) if m.start(1)>30]
    if not positions:return {},[]
    split=int(statistics.median(positions))-1
    answers={}; groups=[]
    for column in [0,1]:
        lines=[line[:split] if column==0 else line[split:] for line in text.splitlines()]
        pending=None
        def flush():
            nonlocal pending
            if not pending:return
            numbers,values,evidence=pending
            text=' '.join(values).strip()
            if not text:pending=None;return
            mode='any'
            if re.search(r'IN\s*(?:ANY|EITHER)\s*ORDER',text,re.I):
                mode='unordered';values=[v for v in values if not re.search(r'ORDER',v,re.I)]
            elif re.search(r'BOTH\s*REQUIRED',text,re.I):
                mode='all';values=[v for v in values if not re.search(r'REQUIRED|FOR\s*ONE\s*MARK',v,re.I)]
            else:values=[text]
            values=[re.sub(r'\s+', ' ',v).strip() for v in values if v.strip()]
            values=[re.sub(r'\bNOT\s*GIVEN\b','NOT GIVEN',v,flags=re.I) for v in values]
            values=[re.sub(r'(?<=\S)\s+I\s+(?=\S)',' / ',v) for v in values]
            if values:
                for n in numbers:answers[n]={'values':values,'mode':mode,'evidence':evidence}
                if len(numbers)>1:groups.append({'numbers':numbers,'values':values,'mode':mode})
            pending=None
        for line in lines:
            value=line.strip()
            if not value:continue
            if re.search(r'Reading Passage|Questions?\s*\d|ANSWER|SP[EP]LLING|scores?\s*1\s*mark|Resource Bank|explanations|LISTENING|acceptable|examination|recommend',value,re.I):flush();continue
            value=re.sub(r'^[Il]\s+(?=[A-Za-z])','1 ',value)
            m=re.match(r'^(\d{1,2})(?:\s*([&–—-])\s*(\d{1,2}))?\s*(.*)$',value)
            if m and 1<=int(m[1])<=41:
                flush();a=int(m[1]);b=int(m[3]) if m[3] else a
                if b-a>4:continue
                nums=list(range(a,b+1)) if m[2] in {'-','–','—'} else list(dict.fromkeys([a,b]))
                pending=(nums,[m[4]] if m[4] else [],[value])
            elif pending:pending[1].append(value);pending[2].append(value)
        flush()
    return answers,groups


def main():
    parser=argparse.ArgumentParser();parser.add_argument('--root',required=True);args=parser.parse_args();root=Path(args.root)
    tests=json.loads((root/'reading-page-map.json').read_text());cache={}
    results=[]
    for t in tests:
        b=t['book']
        if b==1:continue
        if b not in cache:cache[b]={p['page']:p['text'] for p in json.loads((root/f'cache/ci{b}-native.json').read_text())['pages']}
        a,g=parse(cache[b][t['answerPages'][0]])
        if not a:continue
        expected={n for p in t['parts'] for n in range(p['firstQuestion'],p['lastQuestion']+1)}
        results.append({'id':t['id'],'book':b,'test':t['test'],'answers':a,'groups':g,'missing':sorted(expected-a.keys())})
    (root/'native-answer-evidence.json').write_text(json.dumps(results,ensure_ascii=False,indent=2))
    for t in results:print(t['id'],'M',t['missing'],'G',t['groups'])


if __name__=='__main__':main()

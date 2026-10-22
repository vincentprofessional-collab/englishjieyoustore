"""Map only the relevant reading chapters; skip every cover, ad, other skill and preface."""
import argparse
import hashlib
import json
from pathlib import Path

CHAPTERS = {
    3: [[12,17,23,28],[51,57,64,72],[92,96,101,105],[126,133,140,146]],
    4: [[13,24,34,42],[65,75,84,95],[117,126,136,146],[167,174,179,186]],
    5: [[62,72,83,94],[114,124,135,146],[166,175,184,195],[216,223,229,235]],
    6: [[9,15,23,31],[43,50,56,62],[76,82,89,97],[110,113,117,121]],
    7: [[16,23,32,43],[58,70,81,92],[109,117,123,132],[148,155,163,171]],
    8: [[9,15,22,29],[46,52,58,64],[81,88,97,105],[123,131,138,146]],
    9: [[9,17,26,34],[55,62,70,79],[98,107,114,124],[143,151,159,170]],
    10:[[10,18,24,33],[51,58,65,74],[90,98,107,116],[133,141,150,160]],
    11:[[10,17,24,31],[49,55,62,70],[87,94,103,112],[129,139,148,157]],
    12:[[10,16,23,30],[47,54,61,69],[88,96,105,115],[133,141,152,163]],
    13:[[10,18,28,39],[58,66,75,88],[107,114,121,129],[147,154,162,170]],
    14:[[11,19,29,40],[62,71,81,91],[111,118,125,133],[152,158,165,173]],
    15:[[12,22,32,45],[70,80,92,105],[131,140,148,158],[182,189,196,204]],
    16:[[13,24,36,50],[75,85,97,110],[134,142,151,161],[184,193,204,214]],
    17:[[12,22,34,48],[74,83,94,109],[134,144,156,170],[194,204,216,227]],
    18:[[13,24,34,46],[71,82,96,108],[135,147,160,174],[200,211,224,238]],
}
OFFSETS={3:7,4:10,5:9,6:9,7:20,8:12,9:9,10:11,11:10,12:9,13:9,14:9,15:9,16:10,17:10,18:12}
# The combined CI3 scan has missing/reordered physical pages. These ranges were
# checked by passage vocabulary and printed question numbers, not a global offset.
CI3_ANALYSIS={(1,1):[21,22,23],(1,2):[27,28],(1,3):[32,33],
              (2,1):[60,61,62],(2,2):[66,67,68,69],(2,3):[74,75,76,77],
              (3,1):[100,101,102],(3,2):[104,105,144],
              (4,1):[124,125,126],(4,2):[131,132,133,134],(4,3):[137,138,139]}


def main():
    parser=argparse.ArgumentParser();parser.add_argument('--root',required=True);parser.add_argument('--output');args=parser.parse_args()
    source_root=Path(args.root)/'explanations';root=Path(args.output) if args.output else source_root
    root.mkdir(parents=True,exist_ok=True)
    inventory={p['code']:p for p in json.loads((source_root/'manifest.json').read_text())}
    sources=[]
    for b in range(3,19):
        code='3 4 5' if b==3 else '101' if b==10 else str(b)
        row=inventory[code]
        sources.append({'book':b,**row})
    sources.append({'book':102,**inventory['102']})
    by_number={s['book']:s for s in sources}
    for row in sources:
        stat=Path(row['source']).stat(); row['fingerprint']={'bytes':stat.st_size,'mtimeNs':stat.st_mtime_ns}
    (root/'source-manifest.json').write_text(json.dumps({'books':sources},ensure_ascii=False,indent=2))
    chapters=[];plan={str(n):set() for n in by_number}
    for b,tests in CHAPTERS.items():
        for t,starts in enumerate(tests,1):
            for part in range(1,4):
                pages=[]
                for printed in range(starts[part-1],starts[part]):
                    absolute=printed+OFFSETS[b]; source=102 if b==10 and absolute>117 else b
                    no=absolute-117 if source==102 else absolute
                    assert 1<=no<=by_number[source]['pages'],(b,t,part,no)
                    pages.append({'source':source,'page':no,'printedPage':printed})
                # The first answer table can be several pages before the chapter's
                # final five pages. Scan every relevant reading chapter once so
                # that a matched ending cannot conceal missing early questions.
                selected=pages
                status='chapter_mapped'
                if b==3:
                    selected=[{'source':3,'page':n} for n in CI3_ANALYSIS.get((t,part),[])]
                    pages=selected
                    status='chapter_mapped' if selected else 'missing_in_local_source'
                for p in selected:plan[str(p['source'])].add(p['page'])
                chapters.append({'id':f'cambridge-{b}-test-{t}-part{part}','book':b,'test':t,'part':part,'pages':pages,'scanPages':selected,
                                 'status':status})
    (root/'chapter-map.json').write_text(json.dumps(chapters,ensure_ascii=False,indent=2))
    (root/'reading-scan-plan.json').write_text(json.dumps({n:sorted(p) for n,p in plan.items()},indent=2))
    print('Explanation chapters',len(chapters),'incremental OCR pages',sum(len(p) for p in plan.values()))


if __name__=='__main__':main()

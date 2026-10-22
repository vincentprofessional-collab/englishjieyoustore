"""Assemble reviewed text and sanitized guide pages; exclude damaged CI3 scans."""
import argparse
import hashlib
import json
from pathlib import Path
import re
import shutil


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('--state-root',required=True)
    parser.add_argument('--repo',default='.')
    args=parser.parse_args()
    repo=Path(args.repo).resolve();state=Path(args.state_root).resolve();root=state/'explanations'
    tests=json.loads((state/'reading-page-map.json').read_text())
    authored=json.loads((repo/'scripts/data/reading-authored-explanations.json').read_text())
    guides=json.loads((root/'candidate-explanations.json').read_text())
    index=json.loads((root/'render-index.json').read_text())
    output={};assets={};authored_questions=0;not_required=[]
    for test in tests:
        for part in test['parts']:
            part_id=f"{test['id']}-part{part['number']}"
            numbers={str(n) for n in range(part['firstQuestion'],part['lastQuestion']+1)}
            answers={n:text for n,text in authored.get(test['id'],{}).items() if n in numbers}
            if answers:
                if set(answers)!=numbers or any(len(text)<15 for text in answers.values()):
                    raise ValueError(f'{part_id}: incomplete authored analysis')
                output[part_id]={'reviewed':True,'kind':'authored','answers':answers,'pages':[],
                                 'attribution':'自编解析｜依据本卷原文与标准答案编写'}
                authored_questions+=len(answers)
            else:
                guide=guides.get(part_id)
                if not guide or not guide['pages'] or len(guide['matchedKeywords'])<2:
                    not_required.append(part_id);continue
                for page in guide['pages']:
                    name=Path(page['src']).name
                    if not re.fullmatch(r'cambridge-\d+-test-\d+-part[123]-exp\d+-p\d{3}\.webp',name):
                        raise ValueError(f'{part_id}: unexpected asset path')
                    source=root/'review-pages'/name
                    evidence=index[Path(name).stem]
                    if digest(source)!=evidence['sha256']:
                        raise ValueError(f'{part_id}: sanitized page fingerprint changed')
                    assets[name]=evidence
                output[part_id]={'reviewed':True,'kind':'guide','answers':{},'pages':guide['pages'],
                                 'matchedKeywords':guide['matchedKeywords'],'sourceName':guide['sourceName'],
                                 'attribution':f"精讲解析｜{guide['sourceName']}，对应阅读章节"}
    assert len(output)+len(not_required)==252
    target=repo/'public/reading/explanations';target.mkdir(parents=True,exist_ok=True)
    for name,evidence in assets.items():
        destination=target/name
        if not destination.exists() or digest(destination)!=evidence['sha256']:
            shutil.copyfile(root/'review-pages'/name,destination)
    previous_report=repo/'docs/ielts-reading-analysis-review-20261021.json'
    previous_assets=set(json.loads(previous_report.read_text()).get('assets',{})) if previous_report.exists() else set()
    unexpected={p.name for p in target.glob('*.webp')}-set(assets)
    if unexpected-previous_assets:raise ValueError(f'Unreviewed analysis assets in public: {sorted(unexpected-previous_assets)}')
    for name in unexpected:(target/name).unlink()
    temporary=root/'site-explanations.json.tmp'
    temporary.write_text(json.dumps(output,ensure_ascii=False,indent=2))
    temporary.replace(root/'site-explanations.json')
    report={'parts':len(output),'authoredParts':sum(v['kind']=='authored' for v in output.values()),
            'authoredQuestions':authored_questions,'guideParts':sum(v['kind']=='guide' for v in output.values()),
            'sanitizedGuideImages':len(assets),'notRequiredByLatestScope':not_required,'assets':assets}
    (repo/'docs/ielts-reading-analysis-review-20261021.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
    shutil.copyfile(state/'answer-corrections.json',repo/'scripts/data/reading-answer-corrections.json')
    print({k:v for k,v in report.items() if k!='assets'})


if __name__=='__main__':main()

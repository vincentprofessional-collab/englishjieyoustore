"""Local, resumable first-conversation transcript for source/audio association."""
import json, subprocess
from pathlib import Path
from faster_whisper import WhisperModel

cache=Path('/tmp/cet6-intake-20261021')
model_dir=next(Path('/Users/shidianjin/.cache/huggingface/hub/models--Systran--faster-whisper-base.en/snapshots').glob('*/model.bin')).parent
model=WhisperModel(str(model_dir),device='cpu',compute_type='int8',cpu_threads=2,local_files_only=True)
for item in json.loads((cache/'audio-clean/manifest.json').read_text()):
    identity=item['paperId'][-7:]
    out=cache/(identity+'-intro.transcript.txt')
    if out.exists(): continue
    wav=cache/'audio-intro.wav'
    subprocess.run(['/opt/homebrew/bin/ffmpeg','-nostdin','-v','error','-i',item['localPath'],'-t','160','-ar','16000','-ac','1','-y',str(wav)],check=True)
    segments,_=model.transcribe(str(wav),language='en',beam_size=3,vad_filter=False)
    text='\n'.join(f'{seg.start:.1f} {seg.text.strip()}' for seg in segments)
    out.write_text(text+'\n')
    print(identity, 'transcribed',flush=True)
print('COMPLETE',flush=True)

# Compare distinctive words in the opening conversation with the same-date papers.
import re
library=json.loads(Path('src/data/cet6/library.json').read_text())
matching=json.loads((cache/'question-matching-text.json').read_text())
stop=set('there their these those about would should could which where what when have with from that this than they them will your some into more only been were does each part words following section passage answer question questions comprehension directions sheet minutes write essay students university college english based heard choose marked choices least given single letter best conversation once'.split())
def words(text):return set(re.findall(r'[a-z]{4,}',text.lower()))-stop
report=[]
for audio in json.loads((cache/'audio-clean/manifest.json').read_text()):
    transcript=cache/(audio['paperId'][-7:]+'-intro.transcript.txt')
    if not transcript.exists():raise ValueError('Transcript missing: '+audio['paperId'])
    spoken=words(transcript.read_text());ranked=[]
    for entry in library['entries']:
        if entry['section']!='试卷' or entry['id'][-7:-1]!=audio['paperId'][-7:-1]:continue
        question=matching.get(entry['id'],{}).get('listening')
        if not question:
            body=entry['body'];start=re.search(r'Listening\s*Comprehension',body,re.I);end=re.search(r'Reading\s*Comprehension',body,re.I)
            question=body[start.end():end.start()] if start and end else ''
        common=spoken&words(question);ranked.append((round(len(common)/max(1,len(spoken)),3),entry['id'],sorted(common)))
    ranked.sort(reverse=True)
    own=next((row for row in ranked if row[1]==audio['paperId']),None)
    passed=bool(own and own[0]>=.075 and ranked[0][0]-own[0]<=.04)
    report.append({'paperId':audio['paperId'],'sourceSha256':audio['sourceSha256'],'audioSha256':audio['sha256'],'openingMatchScore':own[0] if own else 0,'commonWords':own[2] if own else [],'sameDateRanking':[(row[1],row[0]) for row in ranked],'passed':passed})
Path('data/cet6-review/audio-association.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
print('Audio association:',len(report),'passed:',sum(row['passed'] for row in report),flush=True)
if not all(row['passed'] for row in report):raise ValueError('Audio associations require review')

# Check the end of every recording as well; source advertisements must not survive as speech.
import hashlib
for audio in json.loads((cache/'audio-clean/manifest.json').read_text()):
    out=cache/(audio['paperId'][-7:]+'-ending.transcript.txt')
    if not out.exists():
        wav=cache/'audio-ending.wav'
        subprocess.run(['/opt/homebrew/bin/ffmpeg','-nostdin','-v','error','-ss',str(max(0,audio['duration']-45)),'-i',audio['localPath'],'-ar','16000','-ac','1','-y',str(wav)],check=True)
        segments,_=model.transcribe(str(wav),language='en',beam_size=3,vad_filter=False)
        out.write_text('\n'.join(f'{seg.start:.1f} {seg.text.strip()}' for seg in segments)+'\n')
    row=next(row for row in report if row['paperId']==audio['paperId'])
    text=out.read_text()
    row['endingTranscriptSha256']=hashlib.sha256(text.encode()).hexdigest()
    row['endingChecked']=True
    row['endingPromotionFlag']=bool(re.search(r'subscribe|wechat|we chat|taobao|public account|download (?:our|the) (?:app|course)',text,re.I))
    if row['endingPromotionFlag']:row['passed']=False
Path('data/cet6-review/audio-association.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
print('Audio endings:',len(report),'promotion flags:',sum(row['endingPromotionFlag'] for row in report),flush=True)
if not all(row['passed'] for row in report):raise ValueError('Audio ending requires source review')

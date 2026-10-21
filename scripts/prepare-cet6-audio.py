"""Strip non-audio metadata and prepare resumable web listening files locally."""
import concurrent.futures
import hashlib
import json
import re
import subprocess
import sys
from pathlib import Path

SOURCE = Path("/Volumes/My HDD3/备课/六级/试卷/真题")
OUTPUT = Path(sys.argv[1] if len(sys.argv) > 1 else "/tmp/cet6-intake-20261021/audio-clean")
OUTPUT.mkdir(parents=True, exist_ok=True)
MANIFEST = OUTPUT / "manifest.json"
previous = {e["paperId"]: e for e in json.loads(MANIFEST.read_text())} if MANIFEST.exists() else {}

def probe(path):
    result = json.loads(subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "stream=codec_name:format=duration,bit_rate:format_tags", "-of", "json", str(path)]))
    return {**result["format"], "codecName": result["streams"][0]["codec_name"]}

def prepare(item):
    source, code = item
    paper_id = "cet6-paper-" + code
    target = OUTPUT / (code + ".mp3")
    if paper_id in previous and target.exists(): return previous[paper_id]
    info = probe(source)
    decoded_duration = None
    if target.exists() and target.stat().st_size < 200: target.unlink()
    if not target.exists():
        codec = ["-c:a", "copy"] if info["codecName"] == "mp3" and int(info.get("bit_rate", 0)) <= 70000 else ["-c:a", "libmp3lame", "-b:a", "64k", "-ac", "1", "-ar", "44100"]
        result = subprocess.run(["ffmpeg", "-v", "error", "-progress", "pipe:1", "-nostats", "-i", str(source), "-map", "0:a:0", "-map_metadata", "-1", "-vn", *codec, "-id3v2_version", "0", "-write_id3v1", "0", "-y", str(target)], capture_output=True, text=True, check=True)
        if result.stderr.strip(): raise ValueError(f"Audio decode error: {source.name}: {result.stderr[:150]}")
        times = re.findall(r"out_time_us=(\d+)", result.stdout)
        if times: decoded_duration = int(times[-1]) / 1_000_000
    cleaned = probe(target)
    if cleaned.get("tags"): raise ValueError(f"Unexpected metadata: {code}")
    if decoded_duration is None and abs(float(cleaned["duration"]) - float(info["duration"])) > .15:
        # Some supplied MP3 headers report the wrong duration. Decode without
        # re-encoding the cached file to verify that every audio frame survives.
        result = subprocess.run(["ffmpeg", "-v", "error", "-progress", "pipe:1", "-nostats", "-i", str(source), "-map", "0:a:0", "-f", "null", "-"], capture_output=True, text=True, check=True)
        if result.stderr.strip(): raise ValueError(f"Audio source decode error: {code}")
        decoded_duration = int(re.findall(r"out_time_us=(\d+)", result.stdout)[-1]) / 1_000_000
    decoded_duration = decoded_duration if decoded_duration is not None else float(info["duration"])
    if abs(float(cleaned["duration"]) - decoded_duration) > .15: raise ValueError(f"Decoded duration mismatch: {code}")
    digest = hashlib.sha256(target.read_bytes()).hexdigest()
    return {"paperId": paper_id, "sourceFile": "试卷/真题/" + source.name, "sourceSha256": hashlib.sha256(source.read_bytes()).hexdigest(), "sourceReportedDuration": float(info["duration"]), "decodedDuration": decoded_duration, "localPath": str(target), "sha256": digest, "bytes": target.stat().st_size, "duration": float(cleaned["duration"]), "storagePath": f"cet6/listening/{code}-{digest[:16]}.mp3"}

files = []
for source in sorted(SOURCE.iterdir()):
    if source.name.startswith(".") or source.suffix.lower() != ".mp3": continue
    date = re.search(r"(20\d\d)[年.](1[0-2]|0?[1-9])(?!\d)", source.name)
    variant = re.search(r"(?:第|六级)([123])", source.name)
    if not date: date = re.search(r"(20\d\d)(0[1-9]|1[0-2])", source.name)
    if not date: continue
    number = variant[1] if variant else "1" if re.search(r"全[1一]套|3套相同|202007-CET6", source.name) else None
    if not number: raise ValueError("Unmapped source audio: " + source.name)
    files.append((source, f"{date[1]}{int(date[2]):02d}{number}"))
if len({code for _, code in files}) != len(files): raise ValueError("Duplicate audio destination")
index = json.loads(Path('public/cet6/index.json').read_text())
expected = {entry['id'] for entry in index['entries'] if entry['kind']=='paper' and entry['questionCount']==57}
mapped = {'cet6-paper-' + code for _, code in files}
if mapped != expected: raise ValueError(f'Audio/paper scope mismatch: missing {sorted(expected-mapped)}, extra {sorted(mapped-expected)}')
completed = {identity: item for identity, item in previous.items() if identity in mapped}
with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
    for entry in pool.map(prepare, files):
        completed[entry["paperId"]] = entry
        MANIFEST.write_text(json.dumps(sorted(completed.values(), key=lambda e: e["paperId"]), ensure_ascii=False, indent=2) + "\n")
        print(entry["paperId"], round(entry["duration"], 1), flush=True)
print("CLEAN AUDIO COMPLETE", len(completed), round(sum(e["bytes"] for e in completed.values()) / 1024**2, 1), "MiB", flush=True)

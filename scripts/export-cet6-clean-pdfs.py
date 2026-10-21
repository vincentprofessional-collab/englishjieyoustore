"""Export clean source copies; originals remain available for source comparison."""
import concurrent.futures,hashlib,importlib.util,json,sys,threading
from pathlib import Path
from PIL import Image
from pypdf import PdfReader

root=Path.cwd();destination=Path(sys.argv[1]);destination.mkdir(parents=True,exist_ok=True)
spec=importlib.util.spec_from_file_location('evidence',root/'scripts/cet6-solution-evidence.py');evidence=importlib.util.module_from_spec(spec)
# The evidence module accepts its cache directory as argv[1].
original_argv=sys.argv;sys.argv=[sys.argv[0],'/tmp/cet6-intake-20261021'];spec.loader.exec_module(evidence);sys.argv=original_argv
cache=evidence.CACHE
library=json.loads((root/'src/data/cet6/library.json').read_text());files={item['sha256']:item for item in json.loads((cache/'inventory.json').read_text())}
used={ref['sha256'] for entry in library['entries'] for asset in [*entry['sourceReview'].get('questionAssets',[]),*entry['sourceReview'].get('assets',[])] for ref in asset.get('sourceRefs',[]) if ref['sha256'] in files}
manifest_path=destination/'manifest.json';manifest=json.loads(manifest_path.read_text()) if manifest_path.exists() else {};lock=threading.Lock()
def digest(path):return hashlib.sha256(path.read_bytes()).hexdigest()
def export(sha):
    file=files[sha];target=destination/file['name'];record=manifest.get(sha)
    if record and target.exists() and digest(target)==record['cleanSha256']:return
    pages=json.loads(Path(file['cache'].replace('.norm.txt','.ocr.zh.json')).read_text());container={'file':file,'pages':pages};images=[]
    for page in pages:
        raster=cache/'clean-raster'/(sha+'-'+str(page['page'])+'-v5.png')
        if not raster.exists():evidence.page_asset(container,page['page'])
        with Image.open(raster) as image:images.append(image.convert('RGB'))
    temporary=target.with_suffix('.tmp.pdf')
    images[0].save(temporary,'PDF',save_all=True,append_images=images[1:],resolution=162,quality=95,title=file['name'][:-4],author='',subject='',keywords='',creator='',producer='')
    for image in images:image.close()
    reader=PdfReader(temporary)
    if len(reader.pages)!=len(pages) or any(page.extract_text().strip() or page.get('/Annots') for page in reader.pages):raise ValueError('Source copy validation failed: '+file['name'])
    temporary.replace(target)
    record={'sourceFile':file['name'],'sourceSha256':sha,'cleanSha256':digest(target),'pages':len(pages),'originalTextLayerRemoved':True,'annotationsRemoved':True}
    with lock:
        manifest[sha]=record;temporary_manifest=manifest_path.with_suffix('.tmp');temporary_manifest.write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n');temporary_manifest.replace(manifest_path)
    print('EXPORTED',file['name'],len(pages),flush=True)
with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
    for _ in pool.map(export,sorted(used)):pass
text_dir=destination.parent/'净化版题面文本';text_dir.mkdir(exist_ok=True)
for entry in library['entries']:
    if not entry['sourceReview'].get('imagePaper'):(text_dir/(entry['id']+'.txt')).write_text(entry['body']+'\n')
print('COMPLETE CLEAN PDF COPIES',len(used),flush=True)

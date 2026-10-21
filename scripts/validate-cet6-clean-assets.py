"""Verify the exact source-page images eligible for upload, using cached OCR geometry."""
import ast,hashlib,json,re
from pathlib import Path
from PIL import Image,ImageChops

root=Path.cwd();cache=Path('/tmp/cet6-intake-20261021')
library=json.loads((root/'src/data/cet6/library.json').read_text())
files={item['sha256']:item for item in json.loads((cache/'inventory.json').read_text())}
assets={asset['assetId']:asset for entry in library['entries'] for asset in [*entry.get('sourceReview',{}).get('questionAssets',[]),*entry.get('sourceReview',{}).get('assets',[])] if asset['kind']=='image'}
certificate_path=root/'data/cet6-review/cleaning-validation.json'
previous=json.loads(certificate_path.read_text()) if certificate_path.exists() else {}
trusted=previous.get('validatedAssets',{}) if previous.get('passed') and previous.get('recipe')=='v5' else {}
trusted_pages={sha:set(pages) for sha,pages in previous.get('validatedPages',{}).items()} if trusted else {}
page_keys=set();barcodes=previous.get('barcodeAreasCleared',0) if trusted else 0;promotion_areas=previous.get('videoInvitationAreasCleared',0) if trusted else 0;ocr_pages={}
new_assets=0;new_pages=0
ad_node=next(node for node in ast.parse((root/'scripts/cet6-solution-evidence.py').read_text()).body if isinstance(node,ast.Assign) and any(isinstance(target,ast.Name) and target.id=='AD' for target in node.targets))
advertising=re.compile(ad_node.value.args[0].value,re.I)
def source_page(file,page):
    sha=file['sha256']
    if sha not in ocr_pages:ocr_pages[sha]={row['page']:row for row in json.loads(Path(file['cache'].replace('.norm.txt','.ocr.zh.json')).read_text())}
    return ocr_pages[sha][page]
for identity,asset in assets.items():
    match=re.fullmatch(r'page-clean-v5-([a-f0-9]{16})-(\d+)-0-(\d+)-1000-(\d+)',identity)
    if not match:raise ValueError('Not a full-width v5 source asset: '+identity)
    file=files[asset['sourceRefs'][0]['sha256']];page=int(match[2])
    if match[1]!=file['sha256'][:16]:raise ValueError('Source hash prefix mismatch: '+identity)
    start,end=int(match[3])/1000,int(match[4])/1000
    if start==.02 or end==.975:
        for line in source_page(file,page)['lines']:
            if advertising.search(line['text']) or re.fullmatch(r'\d{1,3}|第\d+[/／]\d+页',line['text'].strip()):continue
            if (start==.02 and line['y']<start-.001) or (end==.975 and line['y']<end-.001 and line['y']+line['h']>end+.001):raise ValueError('Printed content clipped at page margin: '+identity)
    if trusted.get(identity)!=asset['sha256']:
        local=root/'public/cet6/solutions'/(identity+'.webp');data=local.read_bytes()
        if hashlib.sha256(data).hexdigest()!=asset['sha256']:raise ValueError('Image changed: '+identity)
        with Image.open(local) as image:
            if image.info.get('exif') or image.info.get('xmp'):raise ValueError('Original metadata retained: '+identity)
        new_assets+=1
    page_keys.add((file['sha256'],page))
for sha,page_number in page_keys:
    if page_number in trusted_pages.get(sha,set()):continue
    new_pages+=1
    file=files[sha]
    page=source_page(file,page_number)
    if 'barcodes' not in page:raise ValueError('Barcode check absent: '+file['name'])
    raster=cache/'clean-raster'/(sha+'-'+str(page_number)+'-v5.png')
    with Image.open(raster) as original:
        image=original.convert('RGB');width,height=image.size
        for code in page['barcodes']:
            x,y,w,h=[code[key] for key in ['x','y','w','h']]
            area=image.crop((int(x*width)+2,int(y*height)+2,int((x+w)*width)-2,int((y+h)*height)-2))
            if area.size[0]>0 and area.size[1]>0 and min(low for low,high in area.getextrema())<250:raise ValueError('Barcode pixels retained: '+file['name']+' page '+str(page_number))
            barcodes+=1
        promo=[line for line in page['lines'] if line['text'].strip().startswith('老师说')]
        if promo:
            start=min(line['y'] for line in promo)
            area=image.crop((0,int(start*height),width,int(.955*height)))
            if min(low for low,high in area.getextrema())<250:raise ValueError('Video invitation pixels retained: '+file['name'])
            promotion_areas+=1
        if file['date']=='2018-12' and file['kind']=='answer':
            red,green,blue=image.split();low=ImageChops.darker(ImageChops.darker(red,green),blue)
            violet=ImageChops.multiply(ImageChops.difference(red,green).point(lambda v:255 if v<=12 else 0),ImageChops.subtract(blue,green).point(lambda v:255 if v>=12 else 0))
            violet=ImageChops.multiply(violet,low.point(lambda v:255 if v>=145 else 0))
            if violet.getbbox():raise ValueError('Lavender shop watermark pixels retained: '+file['name'])
report={'recipe':'v5','eligibleImages':len(assets),'fullWidthImages':len(assets),'sourcePagesChecked':len(page_keys),'barcodeAreasCleared':barcodes,'videoInvitationAreasCleared':promotion_areas,'originalMetadataRemoved':True,'defaultPageBoundariesChecked':True,'clippedBodyLines':0,'passed':True,'imageManifestSha256':hashlib.sha256('\n'.join(identity+':'+asset['sha256'] for identity,asset in sorted(assets.items())).encode()).hexdigest()}
report['validatedAssets']={identity:asset['sha256'] for identity,asset in sorted(assets.items())}
report['validatedPages']={sha:sorted(page for source,page in page_keys if source==sha) for sha in sorted({source for source,page in page_keys})}
certificate_path.write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({**{key:value for key,value in report.items() if key not in ['validatedAssets','validatedPages']},'newAssetsChecked':new_assets,'newPagesChecked':new_pages}))

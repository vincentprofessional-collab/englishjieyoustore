import importlib.util
import json
from pathlib import Path


spec = importlib.util.spec_from_file_location("senior_high_import", "scripts/senior_high_v2_import.py")
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
corpus = module.Corpus(module.ROOT, module.INVENTORY, module.CHECKPOINT)
items = [
    {
        "id": "paper-2024-national-eaf467d6a8f1",
        "relative": "历年真题/【未上传】2024年高考英语试卷（全国甲卷）（解析卷）.docx",
        "title": "2024年普通高等学校招生全国统一考试（全国甲卷）",
        "region": "全国",
        "variant": "全国甲卷",
    },
    {
        "id": "paper-2024-tianjin-27a290d25555",
        "relative": "历年真题/【未上传】2024年高考英语试卷（天津）（第一次）（解析卷）.docx",
        "title": "2024年3月天津高考英语第一次高考真题",
        "region": "天津",
        "variant": "天津卷（第一次）",
    },
    {
        "id": "paper-2024-zhejiang-bb3fb00e8526",
        "relative": "历年真题/【未上传】2024年高考英语试卷（浙江）（1月）（解析卷）.docx",
        "title": "2024年1月普通高等学校招生全国统一考试（浙江卷）",
        "region": "浙江",
        "variant": "浙江卷（1月）",
    },
]

out_dir = Path("data/senior-high/v2/gold")
for item in items:
    data = module.legacy_paper(corpus, {"id": item["id"], "sources": [item["relative"]]})
    data.update(title=item["title"], year="2024", region=item["region"], variant=item["variant"])
    (out_dir / f"{item['id']}.json").write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

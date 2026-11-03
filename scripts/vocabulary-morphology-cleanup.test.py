import importlib.util
from pathlib import Path


script = Path(__file__).with_name("import-latest-vocabulary-sheet.py")
spec = importlib.util.spec_from_file_location("vocabulary_importer", script)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

headers = {"词源": 0, **{f"词根/词缀{i}": i for i in range(1, 9)}, "词根组成": 9, "词根信息来源": 10}


def row(etymology="", parts=(), source=""):
    cells = [None] * 11
    cells[0], cells[10] = etymology, source
    for index, part in enumerate(parts, start=1):
        cells[index] = part
    return cells


assert module.clean_morphology(row("GCIDE: old etymology", ["babe"], "GCIDE"), headers, "baby") == ("", [], "")
assert module.clean_morphology(
    row('GCIDE: old form; PIE root *so- "this, that"', ["ee", "历史词形/同源形式（非构词拆分）：ee", 'PIE root *so- "this, that"；这'], "GCIDE；Etymonline词源明确拆分/提及"),
    headers,
    "the",
) == ('', ['PIE root *so- "this, that"；这'], "Etymonline词源明确拆分/提及")
assert module.clean_morphology(
    row("GCIDE: Pref. a- + back", ["a-（方向前缀）", 'Old English bæc "back,"；返回'], "同族词推断"),
    headers,
    "aback",
) == ("", ["a-（方向前缀）", "back（后方；背部）"], "同族词推断")
assert module.clean_morphology(row("组成词：about；根据各组成词词根推断。", ["ab-", "Old English aboute", 'PIE root *ambhi- "around"；周围'], "Etymonline"), headers, "about") == ('', ["ab-（离开、远离）", 'PIE root *ambhi- "around"；周围'], "Etymonline")
assert module.clean_morphology(row("PIE root *oi-no-; GCIDE: source text", ["a-", "an", "on"], "GCIDE"), headers, "a") == ("", [], "")
assert module.clean_morphology(row("historical source", ["Old Saxon endi", "PIE root *en \"in\""], "Etymonline"), headers, "and")[1] == ['PIE root *en "in"']
for word, parts in module.MORPHOLOGY_CORRECTIONS.items():
    cleaned = module.clean_morphology(row("组成词：来源拼合", parts, "同族词推断"), headers, word)
    assert cleaned[1] == parts, word
abolitionist = module.clean_morphology(
    row("PIE root *al-", ['Latin ab "off, away from"；离开、从', 'PIE root *al- (2)-to grow, nourish；生长、滋养', "-ition（动作后缀）", '-ist（表示从事者）'], "总完成源表"),
    headers,
    "abolitionist",
)
assert abolitionist[1] == ['Latin ab "off, away from"；离开、从', 'PIE root *al- (2)-to grow, nourish；生长、滋养', "-ition（动作后缀）", '-ist（表示从事者）']

print("morphology cleanup self-check passed")

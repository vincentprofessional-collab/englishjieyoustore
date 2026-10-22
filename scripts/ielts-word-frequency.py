"""Count the source corpus with POS-aware lemmas and an explicit exclusion ledger."""
import argparse
from collections import Counter, defaultdict
import hashlib
import json
from pathlib import Path
import re
from functools import lru_cache

import nltk
from nltk.corpus import wordnet as wn, words, names
from nltk.stem import WordNetLemmatizer
from nltk.tokenize import TreebankWordTokenizer

IRREGULAR_DEGREES = set("better best worse worst more most less least farther further farthest furthest elder eldest".split())
ABBREVIATIONS = set("ielts uk usa us uae eu un unesco bbc nasa tv dvd cd pc it iq eq ai gdp gnp phd dr mr mrs ms prof etc eg ie ltd inc co vs id asap".split())
AMBIGUOUS_ABBREVIATIONS = {"it", "us", "am", "ai", "id", "co", "inc", "pc"}
UNITS = set("cm mm km kg mg ml hz khz mhz ghz mph kph am pm cm2 cm3 km2 m2 m3 celsius fahrenheit kilohertz megahertz gigahertz kilometre kilometer centimetre centimeter millimetre millimeter kilogram milligram millilitre milliliter".split())
UNITS.add("ins")
UNITS.update("min mins sec secs hr hrs ft yd yds lb lbs oz sqft sqm bpm mb gb".split())
LANGUAGES = set("english french german spanish italian chinese japanese russian arabic latin greek portuguese".split())
GERUNDS = dict(zip("learning teaching training reading writing listening swimming shopping running marketing planning spending working studying fishing camping cooking smoking parking cycling advertising recycling farming manufacturing".split(), "learn teach train read write listen swim shop run market plan spend work study fish camp cook smoke park cycle advertise recycle farm manufacture".split()))
PROMO = re.compile(r"公众号|淘宝|微信|微博|二维码|练习方式|topsage|ieltsbro|laokaoya|小站雅思|雅思哥", re.I)
LEMMATIZER = WordNetLemmatizer()
TOKENIZER = TreebankWordTokenizer()


def lemma_for(word, tag):
    word = word.lower().replace("’", "'")
    if word in {"moral", "morals"}:
        return "moral"
    if word == "bees":
        return "bee"
    if word in {"means", "news", "species", "series", "headquarters"} and tag.startswith("N"):
        return word
    if word == "people" and tag == "NNS":
        return "person"
    if word in GERUNDS and tag in {"VBG", "NN", "NNS"}:
        return GERUNDS[word]
    pos = {"J": "a", "V": "v", "N": "n", "R": "r"}.get(tag[:1])
    if pos is None:
        return word
    return LEMMATIZER.lemmatize(word, pos)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--corpus", required=True)
    parser.add_argument("--output", required=True)
    parser.add_argument("--nltk-data", required=True)
    args = parser.parse_args()
    nltk.data.path.insert(0, args.nltk_data)
    person_names = {word.lower() for word in names.words()}
    @lru_cache(maxsize=None)
    def proper_name(word):
        if word in {"moral", "morals", "i"} or word in LANGUAGES:
            return False
        if word in person_names:
            return True
        synsets = wn.synsets(word)
        location = any(s.lexname() == "noun.location" and any(l.name()[0].isupper() for l in s.lemmas()) for s in synsets)
        common = any(any(l.name()[0].islower() for l in s.lemmas()) for s in synsets)
        return location or not common
    dictionary = {w.lower() for w in words.words() if w.isalpha()}
    dictionary.update(w.strip().lower() for w in Path("/usr/share/dict/words").read_text().splitlines())
    dictionary.update("a i okay ok internet email online offline website biodiversity microplastic nanotechnology".split())
    corpus = json.loads(Path(args.corpus).read_text())
    output = Path(args.output)
    output.mkdir(parents=True, exist_ok=True)
    counters = defaultdict(Counter)
    forms = defaultdict(Counter)
    coverage = defaultdict(set)
    deleted = Counter()
    samples = {}
    sources = []
    for record in corpus:
        key = f"{record['skill']}:{record['id']}"
        text = "\n".join(line for line in record["text"].splitlines() if not PROMO.search(line))
        text = re.sub(r"https?://\S+|www\.\S+|\S+@\S+", " ", text)
        text = re.sub(r"\b(?:wo|Wo)n't\b", "will not", text)
        text = re.sub(r"\b(?:ca|Ca)n't\b", "can not", text)
        text = text.replace("’", "'")
        digest = hashlib.sha256(("policy-v6\n" + text).encode()).hexdigest()
        cache = output / "nlp-cache" / f"{key.replace(':', '-')}.json"
        if cache.exists() and (result := json.loads(cache.read_text())).get("sha256") == digest:
            accepted, removed = result["accepted"], result["removed"]
        else:
            accepted, removed = [], []
            chunks = re.split(r"(?<=[.!?])\s+|\n{2,}", text)
            for chunk in chunks:
                tokens = TOKENIZER.tokenize(chunk)
                for offset in range(0, len(tokens), 300):
                    tagged = nltk.pos_tag(tokens[offset:offset + 300])
                    for index, (surface, tag) in enumerate(tagged):
                        word = surface.lower()
                        if not re.fullmatch(r"[a-z]+(?:-[a-z]+)*", word):
                            continue
                        reason = None
                        if word in IRREGULAR_DEGREES or tag in {"JJR", "JJS", "RBR", "RBS"}:
                            reason = "比较级或最高级"
                        elif word in ABBREVIATIONS and (word not in AMBIGUOUS_ABBREVIATIONS or surface.isupper()) or surface.isupper() and len(word) > 1 and not wn.synsets(word):
                            reason = "缩写"
                        elif word in UNITS and (word not in AMBIGUOUS_ABBREVIATIONS or surface.isupper()):
                            reason = "单位或时间缩写"
                        elif tag in {"NNP", "NNPS"}:
                            if len(word) == 1 and word != "i":
                                reason = "残片或选项标记"
                            elif proper_name(word):
                                reason = "人名地名等专名"
                            else:
                                tag = "NNS" if tag == "NNPS" else "NN"
                        if len(word) == 1 and word not in {"a", "i"}:
                            reason = "残片或选项标记"
                        lemma = lemma_for(word, tag)
                        if not reason and lemma not in dictionary and not wn.synsets(lemma) and not ("-" in lemma and all(p in dictionary for p in lemma.split("-"))):
                            reason = "可识别残片或未识别词"
                        if reason:
                            removed.append([surface, reason])
                        else:
                            accepted.append([lemma, word])
            cache.parent.mkdir(exist_ok=True)
            cache.write_text(json.dumps({"sha256": digest, "accepted": accepted, "removed": removed}, ensure_ascii=False))
        for lemma, surface in accepted:
            counters[record["skill"]][lemma] += 1
            forms[lemma][surface] += 1
            coverage[lemma].add(f"CI{record['book']}")
        for surface, reason in removed:
            deleted[(surface, reason)] += 1
            samples.setdefault((surface, reason), key)
        sources.append({"book": record["book"], "skill": record["skill"], "id": record["id"],
                        "pages": record["pages"], "accepted": len(accepted), "deleted": len(removed),
                        "sha256": digest})
        if record["id"].endswith("audioscripts"):
            print(f"CI{record['book']}: corpus counted and cached", flush=True)
    all_words = counters["listening"] + counters["reading"]
    rows = [{"lemma": word, "total": count, "listening": counters["listening"][word],
             "reading": counters["reading"][word], "bookCount": len(coverage[word]),
             "forms": "; ".join(f"{form}: {n}" for form, n in forms[word].most_common()),
             "formCounts": dict(forms[word])}
            for word, count in sorted(all_words.items(), key=lambda item: (-item[1], item[0]))]
    deletion_rows = [{"word": word, "reason": reason, "count": count, "sample": samples[(word, reason)]}
                     for (word, reason), count in deleted.most_common()]
    assert lemma_for("morals", "NNS") == lemma_for("moral", "JJ") == "moral"
    assert lemma_for("went", "VBD") == lemma_for("going", "VBG") == "go"
    assert lemma_for("children", "NNS") == "child"
    assert lemma_for("us", "PRP") == "us" and lemma_for("as", "IN") == "as"
    assert not set(IRREGULAR_DEGREES).intersection(all_words)
    assert all(row["total"] == row["listening"] + row["reading"] == sum(row["formCounts"].values()) for row in rows)
    result = {"rows": rows, "deleted": deletion_rows, "sources": sources,
              "counts": {"lemmas": len(rows), "tokens": sum(all_words.values()),
                         "listeningTokens": sum(counters["listening"].values()), "readingTokens": sum(counters["reading"].values()),
                         "deletedTokens": sum(deleted.values()), "books": sorted({r['book'] for r in corpus})}}
    (output / "frequency-data.json").write_text(json.dumps(result, ensure_ascii=False, indent=2))
    print(json.dumps(result["counts"]))


if __name__ == "__main__":
    main()

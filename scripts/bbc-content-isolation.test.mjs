import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const dataRoot = path.join(root, "src", "data", "bbc");
const bbcSource = fs.readFileSync(path.join(root, "src", "lib", "articles", "bbc.ts"), "utf8");
const articleRouteSource = fs.readFileSync(
  path.join(root, "src", "app", "articles", "[articleId]", "page.tsx"),
  "utf8",
);

const articleIds = new Set();
for (const year of fs.readdirSync(dataRoot).filter((entry) => /^20\d{2}$/.test(entry))) {
  const indexPath = path.join(dataRoot, year, "index.json");
  const articles = JSON.parse(fs.readFileSync(indexPath, "utf8"));
  for (const article of articles) {
    assert.equal(articleIds.has(article.id), false, `BBC 文章 ID 重复：${article.id}`);
    articleIds.add(article.id);
    assert.ok(article.paragraphs?.length, `BBC 文章缺少正文：${article.id}`);
    assert.ok(article.sentences?.length, `BBC 文章缺少逐句数据：${article.id}`);
    assert.ok(article.sentences.every((sentence) => sentence.chinese), `BBC 文章缺少中文句译：${article.id}`);
  }
}

assert.doesNotMatch(bbcSource, /BBC_ARTICLES\.findIndex\(/);
assert.match(articleRouteSource, /getPaidContentKey\("bbc-article", article\.id\)/);
assert.doesNotMatch(articleRouteSource, /findIndex\(|articleIndex/);

console.log(`BBC 内容隔离校验通过：${articleIds.size} 篇文章，访问权限按稳定文章 ID 判断。`);

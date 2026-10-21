# 六级任务当前检查点

工作区：`/Users/shidianjin/Projects/englishjieyoustore-cet6-source-review-20261021`。
分支：`codex/cet6-source-review-20261021`；发布前已fetch的main为2618984。

已完成76套3507题、六种专项、2694份媒体上传回读、49份音频首尾检查、2662个净化图及2374页验证、136份净化PDF和16份题面文本归档。六级内容测试10项全部通过，解析配对未决问题为0。2011稿归档待补，不纳入本轮范围。

最终完整 `npm run build -- --webpack` 已通过：8项BBC句法测试、199项预构建回归、TypeScript及1446页生成全部成功。正文与页边缘修复后的六级10项测试亦通过，日志 `/tmp/cet6-build.log`。随后发布精确审阅提交并回读82个题卷/专项JSON。正式提交和生产验收以外盘`六级真题核验_2026-10-21/发布验收回执.json`为准。

不要重新运行全量select-cet6-sources，它会重置已核验媒体URL。OCR与音频转写缓存可续用；public/cet6/solutions是本任务临时图，归档核验完成后移出public，网站使用已经上传的不可变媒体URL。

详见同目录README.md、cleaning-validation.json、media-manifest.json、audio-association.json和solution-mapping.json。私有证据缓存归档到外盘“校对缓存_勿上传”。

# IELTS阅读1–21与词频交付检查点

更新：2026-10-22。本文件为最新状态，替代此前的未完成清单。

## 最新用户范围

- 剑桥1–21阅读原文、题目、标准答案须正确、完整，标题段落与PDF保持一致；沿用中高考做题页设计。
- 可练习、提交判分和进行60分钟整卷模考；下载逐卷MD。
- 已完成解析保留并正常显示；不再补做后续解析。没有解析的篇章照常提供标准答案。
- 听力与阅读词频Excel按频次降序，归并词形并删除人名、地名、缩写、单位、残片及比较级/最高级；moral/morals合并。
- 去除无关推广、水印、二维码、泛化练习方法；原始PDF保持不变。
- 不使用额外子代理、并行浏览器、计算机控制或额外审核模型。本任务未使用这些工具。

## 工作区与发布边界

- 唯一工作区：`/Users/shidianjin/Projects/englishjieyoustore-ielts-reading-source-20261021`
- 分支：`codex/ielts-reading-source-20261021`，初始基线`2618984f3bb20c984ca689e4685a8b41b61aa0f4`。
- 统一发布调度要求：本分支完成验证并提交；不新建树，不自行push main，不向其他对话发消息。结果由原对话最终回复提供。
- 正式发布仍需整合最新main并通过完整构建；BBC 29篇等既有基线不得删除。

## 已完成内容

- 84套、252篇、3,358题。第1册原题数40/41/38/39；其余40。第12册印刷Test 5–8，稳定内部ID1–4。
- 1,138张原卷清理图、84份MD。每篇原文栏保留连续原卷页，题目栏保留所有续页；MD包含原文栏及题目栏的页码并集。
- 所有原文与题目直接渲染PDF，不使用OCR重排正文。OCR只用于定位、检索及安全检查，因此不会把识别错字写成正文。
- CI2T1Q18为vii；CI2T4官方答案是学术类第152页，已重新核对40题，不用GT第153页。CI2T3P3题面额外保留物理66页。
- 已完成解析219篇：105篇自编（1,398题），114篇精讲（690张清理图）。33篇不再补解析，依用户最新范围处理，原文、题目、标准答案均完整。
- 第3–8册水印与正文重叠的精讲不上传；其中已完成的自编解析保留。第11册6篇二维码遮挡正文的精讲不上传，第10册物理113页整页广告不上传。
- 第17册推广横幅为独立PDF图片对象957/977/946，移除该层并保留底层文字；已检查Questions 7–13标题及题型说明完整。第12册“些微信息”等正常正文未被推广规则误删。
- 多选题任意顺序且重复限分、单题同时多项、可选词形及判断题缩写均已实现。缺失标准答案保留待核对状态，禁止误判为错；本批所有标准答案完整。
- 页面复用中高考全局CSS，支持双栏、手机文章/题目切换、计时、提交、原答案与已完成解析、重做、刷新恢复和已有账号进度接口。

## Excel

- 文件：`/Users/shidianjin/outputs/ielts-reading-20261021/雅思听力阅读词频_剑桥1-21.xlsx`
- 14,389词元、544,838次有效出现，听力262,531、阅读282,307；删除36,124次。
- moral/morals=26，be/bee分开。词频/删除记录/统计口径三表，含21源PDF SHA和页数。
- 独立QA：排序、唯一、词频公式缓存、分项及总计、moral与无Excel错误全部通过，见同目录`excel-quality-gate.json`。

## 来源与有效缓存（禁止重复大批OCR或扫描大tar）

- 外盘只读根：`/Volumes/My HDD3/网站/Codex任务产物归档_2026-10-10/IELTS阅读_剑桥1-21_2026-10-21`。
- 主PDF1–20：`/Volumes/My HDD3/备课/IELTS/剑桥雅思`；第21册：`/Users/shidianjin/Documents/留学考试-雅思/剑桥雅思/剑桥雅思21/剑21-A类.pdf`。
- 外盘`source-manifest.json`、`cache/ciN-native.json`、`legacy-cache`、`ocr`、`safety-scan`、`vision-keys`、`answer-evidence.json`已有效，不重做。
- 11.11GB共享tar已提取必要的11个旧OCR缓存，不再扫描。
- 当前可写缓存`tmp/reading-review/`已gitignore。`reading-page-map.json`、`answer-corrections.json`、`rendered-page-index.json`、`reading-image-safety-plan.json`为当前有效版。
- TSV使用QUOTE_NONE，防止文字引号吞行；旋转PDF遮盖使用derotation_matrix，防止损伤答案。修复结果见`repaired-primary/`，不要以旧缓存覆盖。
- 解析`explanations/candidate-explanations.json`、`render-index.json`、`site-explanations.json`与私有`review-pages`已缓存。被排除的旧解析只留私有缓存；不能再复制到public。
- 720页剩余解析原页已经过CPU Vision二维码扫描；原页检查检出8个有二维码的页面，最终衍生图又检出1页，均逐项处理，不能使用早先CoreImage全0结果充当验证。PNG/WEBP阳性控制均识别1码。
- 最终public图片扫描增量缓存：`tmp/reading-review/final-public-qr-audit.json`，每个结果绑定图片SHA256，断线从有效结果继续。

## 质量门与回读

- `tmp/reading-review/publication-gate.json`：84套标准答案齐全、原页可用；解析完整率不再作为本次发布必需条件。
- `scripts/reading-source.test.mjs`10项与`scripts/reading-source-ocr.test.py`1项通过。
- 最终`npm run build`通过，包含BBC 29篇基线及原账号进度回归；1479个静态页面生成成功。日志`tmp/reading-review/final-build.log`。
- 本轮本机生产预览使用127.0.0.1:3107，验证后已停止。168个练习/模考入口回读全部通过；最终1,828张图片已逐张检测，无残留二维码命中。最后排除CI11T1P1整篇受二维码影响的精讲，其余有效扫描复用SHA绑定结果，不重复扫描。
- 未启动浏览器交互测试；HTTP、来源完整性、判分、文件指纹及构建已纳入验证，不冒称手动浏览器全流程通过。

## 发布文件与后续

- `public/reading/source-pages/*.webp`：1,138张。
- `public/reading/explanations/*.webp`：690张已完成精讲清理副本。
- `public/reading/sources/*.md`：84份。
- `src/lib/ielts/source-reading-tests.json`、源文判分模型与做题组件、账号进度key识别，以及对应生成/核验脚本。
- 上传图片共1,828张；整个public/reading约639.8MB。均为现有静态资源接入，无新增云存储依赖，不上传原PDF、私有OCR缓存或.env.local。
- 发布清单：`docs/剑桥雅思1-21阅读对照与发布清单.md`，逐图来源清单`docs/ielts-reading-source-review-20261022.json`，已完成解析清单`docs/ielts-reading-analysis-review-20261021.json`。
- 最终构建和扫描均通过，原卷/答案完整，1,828张最终图片无二维码命中；本分支提交SHA由本对话最终回复记录。调度集中整合和发布；本批尚未推送或部署。

## 最终回读补充

- 168个练习/模考入口回读全部通过。最后清理CI11T1P1后，再核对两种模式、两个目录、84份MD和3张代表性图片，共91项检查全部通过。
- 最终整站build再次通过；上传门绑定1,828张图片的SHA256集合，确保未经复核的素材变化不能绕过prebuild。
- 仅提交本任务文件。原PDF、私有缓存、依赖、环境文件均不在提交范围；CET4/6生成时间戳差异已恢复。

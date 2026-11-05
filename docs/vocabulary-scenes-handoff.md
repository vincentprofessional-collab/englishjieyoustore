# 场景图片统一发布交接 · 2026-11-06

当前工作树：`/Users/shidianjin/Projects/englishjieyoustore-vocab-ui-20261030`，分支`codex/vocab-details-20261030`，基准HEAD`c0b24cf`。未提交、未push、未部署；保留工作树中其他任务的修改。

统一发布顺序：场景图片排在其他任务之后，沿用本检查点，不另开生产发布，不重做已核验的图片、上传和测试。资产存于Supabase，不迁往Cloudflare；BBC音频不在本任务改动范围内。

## 本轮发布范围

- 最新范围为**仅admin开放**。其他用户（含已有付费权益）访问页面显示“暂未达到上线质量标准”；元数据API返回403，旧图片API返回404。
- 初中80组/1600词，高中155组/3100源记录。高中`per cent`的两条拆分源记录合并成一张教学卡，共4699词卡、235场景。
- 粉色飘带双语标题始终显示；正文英文、音标、中文独立显隐。现有最终图不重绘，词少时的布局沿用已确认成品。
- 听力播放完再计反应时间；阅读按下方英文找图片词框；口语使用自己的计时后揭示并播放；写作看中文拼英文。正确/错误提示音、正确目标绿色高亮、详情计时后自动下一词；复用现有UK/US词音。

## 已完成的存储部署

Supabase项目`ahecwiqjfrrxxjxazmre`，私有桶`vocabulary-scene-images`。已上传265对象（235最终底图+30既有页面预览资源），508919536字节。已按路径、大小、MD5核对，整体指纹`19647abc874a9474529ebf6e725e2e41`与本地计划一致。不要重复上传。

场景API只返回元数据和600秒Storage签名URL；旧图片API只307重定向，响应体0字节。图片由浏览器直连Supabase，应用服务器不读取或转发图片字节。30个既有public图片文件已迁出，原始字节与Git原版核对一致；部署包只保留JSON元数据。

前端不提供下载按钮，禁止图片拖动、上下文菜单和长按选择；这是基础防误下载措施，不能防截屏或授权用户提取已加载资源。

## 验证及证据

- `node --test scripts/vocabulary-scene-learning.test.mjs`：9/9通过。包含7种真实授权模块的模拟边界（admin、普通/付费角色、鉴权与数据库异常），四模式可见性、独立口语时间、拼写、随机去重、入口参数及全部235组源词/点击框校验。
- `NODE_OPTIONS=--max-old-space-size=12288 npx tsc --noEmit --pretty false`：通过。默认4GB堆曾不足，增加本地检查堆后完成，未跳过类型检查。
- 浏览器11项：点击显隐、阅读正误反馈、听力先播后计时、写作正误、口语独立1秒、详情后下一词、768px平板26词、390px手机44px点击区、访客从真实设置入口进入质量提示。图片加载、标题及无横向溢出均通过。
- 先前13项真实Supabase/HTTP检查验证过私有URL、管理员免费、过期/无权益拒绝、旧图重定向0字节及最后一组。**其中“项目终身权益可访问”已被最新admin-only要求取代，不作为本轮付费开放依据。**该临时测试账号已全局登出、撤销会话并删除，未保留凭据。
- 最新匿名HTTP复核：元数据403，旧图片404，场景页200且仅质量提示、无购买文案。
- `git diff --check`通过。BBC既有prebuild基线保留，仅追加场景测试。

证据目录：`/Users/shidianjin/Documents/Codex/2026-11-03/an/outputs/场景图片网站接入核验_2026-11-06/`。最新界面证据为`访客点击场景入口_仅管理员预览.jpg`、`手机_arm点击显隐_网站.jpg`及`平板_高中26词场景.jpg`。

## 文件范围

新增场景文件：

- `src/components/vocabulary-scene-learning.tsx`、`src/components/vocabulary-scene-learning.module.css`
- `src/lib/vocabulary/scene-learning.ts`、`src/lib/vocabulary/scenes-server.ts`、`src/lib/vocabulary/vocabulary-scene-image-access.ts`
- `src/app/vocabulary/scene-images/page.tsx`
- `src/app/api/vocabulary-scenes/[sceneId]/route.ts`、`src/app/api/vocabulary-scene-images/[...path]/route.ts`
- `src/data/vocabulary-scenes/`共237个JSON（235场景、index、legacy）。完整逐文件清单见本目录`vocabulary-scenes-file-manifest.json`。
- `scripts/import-vocabulary-scenes.py`、`scripts/upload-vocabulary-scenes.mjs`、`scripts/vocabulary-scene-learning.test.mjs`
- `supabase/migrations/20261105123147_vocabulary_scene_images_access.sql`（先前价格准备）及`20261106000000_vocabulary_scene_images_admin_preview.sql`（本轮停用购买，见待处理项）。
- 本交接文件、检查点及文件清单。

共享文件中的场景修改：

- `src/components/vocabulary-learning.tsx`：入口、设置继承、真实80/155场景组和权限提示。
- `src/app/vocabulary/books/page.tsx`：服务端传递可访问状态。
- `src/lib/access-control.ts`：场景项目登记；不加入当前可购买项目列表。
- `next.config.ts`：只追踪场景JSON，图片不打包。
- `package.json`：追加场景测试，保留完整BBC基线。
- `src/components/primary-vocabulary-story-preview.tsx`、`src/components/senior-high-vocabulary-story-preview.tsx`及对应CSS：保留已存在的私有资源引用/保护改动。
- `public/vocabulary-stories/`30个文件删除：均已私有迁移，有legacy路径映射。

其余脏文件由统一发布对话归属核对；不要把所有修改自动当成本场景任务。`next-env.d.ts`是本地Next生成变化，发布前由统一负责人按项目约定检查。

## 发布前仍需处理

1. **生产购买方案停用待直接授权。**生产DB当前`vocabulary.scene-images`项目和`lifetime`方案仍启用，价格29.90。执行已准备的停用SQL被自动审批拒绝，理由为缺少用户对生产购买/权限变更的直接授权；没有改用SDK或其他路径绕过。已向用户提出确认。确认后只停用该项目和方案，保留图片、价格与已有权益记录；再读回`project_enabled=false`、`plan_enabled=false`及`project_access_amount_cny=null`。此项解决前不能宣称购买已关闭。
2. 统一发布负责人检查生产存在`SUPABASE_SECRET_KEY`或`SUPABASE_SERVICE_ROLE_KEY`（仅服务端）和`NEXT_PUBLIC_SUPABASE_URL`。本地使用已有服务端密钥完成签名验证，未读取或修改生产环境变量。
3. 本对话交接后由统一发布负责人执行一次完整`npm run build`（含BBC等既有基线），按AGENTS发布规范检查最新main、统一提交/部署；本对话不push、不部署。
4. 发布后以admin及匿名/普通/付费角色回读页面和API；确认Network中图片直达Supabase、Vercel无图片字节转发、无静态public副本。正式支付交易未测试，也不在本轮开放范围。

本地预览中的既有登录Origin代理403及全站Logo图片优化器对代理fake-IP的拦截，没有通过修改代理、认证或`dangerouslyAllowLocalIP`处理；场景直连图片核验已通过。这些本地观察不应触发本场景任务扩大权限或修改无关认证配置。

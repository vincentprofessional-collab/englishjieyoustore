# 场景图片统一发布交接 · 2026-11-06

当前工作树：`/Users/shidianjin/Projects/englishjieyoustore-vocab-ui-20261030`，分支`codex/vocab-details-20261030`。场景功能已随统一发布提交`72e124f5fc972a8fd81589dbccafc09d33d7b309`进入`origin/main`；完整构建通过，部署已成功。本文于2026-11-06按线上数据库回读更新。

场景图片按用户要求在“场景图片”对话完成制作与核验，统一发布时复用其235组成果，不重做已核验的图片、上传和测试。资产存于Supabase，不迁往Cloudflare；BBC音频不在本任务改动范围内。

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

## 发布及权限回读

1. **生产购买已停用。**2026-11-06对Supabase项目`ahecwiqjfrrxxjxazmre`回读确认`vocabulary.scene-images.is_enabled=false`、`lifetime.is_enabled=false`，价格记录仍为29.90、`project_access_amount_cny=null`；没有该项目的用户权益记录。停用迁移已应用，不删除旧价格记录。
2. **统一发布已完成。**发布提交为`72e124f5fc972a8fd81589dbccafc09d33d7b309`，与`origin/main`一致。完整`npm run build`通过，BBC既有prebuild基线通过；Vercel对应Git提交检查成功。场景图片资产与逐组验收结果来自“场景图片”对话，清单和测试结果见上文；未重复生成或上传。
3. 场景访问维持admin-only：匿名、普通和付费用户都显示“暂未达到上线质量标准”，不出现购买入口。正式支付交易不在本次开放范围内。
4. 生产环境变量的值未读取或回显；发布环境的密钥保持在服务端使用。不要把密钥写入源码、文档或聊天。

本地预览中的既有登录Origin代理403及全站Logo图片优化器对代理fake-IP的拦截，没有通过修改代理、认证或`dangerouslyAllowLocalIP`处理；场景直连图片核验已通过。这些本地观察不应触发本场景任务扩大权限或修改无关认证配置。

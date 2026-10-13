# BBC 音频存储与会员播放

BBC 音频保存在 Cloudflare R2 的 `englishjieyou-bbc-audio` 存储桶，路径前缀为 `bbc/`。网站上的完整音频和逐句音频都通过 `/api/bbc-audio/{year}/{articleId}/{file}` 播放。该接口逐次核验 BBC 项目的付费权限，然后由服务器用只读凭据读取 R2，并转发音频及 HTTP Range 响应。

生产环境需要以下**仅供服务器使用**的变量：

```text
R2_ACCOUNT_ID=Cloudflare Account ID
R2_BBC_AUDIO_BUCKET=englishjieyou-bbc-audio
R2_BBC_AUDIO_ACCESS_KEY_ID=仅对该存储桶拥有 Object Read 的 Access Key ID
R2_BBC_AUDIO_SECRET_ACCESS_KEY=对应的 Secret Access Key
```

不要配置或恢复 `NEXT_PUBLIC_BBC_AUDIO_BASE_URL`，也不要启用此存储桶的 R2 Public Development URL 或公共自定义域名。浏览器不应收到 R2 源站地址或凭据。变更存储权限时，先验证会员可以通过网站音频接口播放完整音频和逐句音频，再关闭旧的公开地址，最后验证旧地址拒绝匿名读取。

上传新音频可继续使用 `scripts/upload-bbc-audio-to-r2.mjs`，但应使用单独的受限写入凭据。上传脚本的 `R2_ACCESS_KEY_ID` 和 `R2_SECRET_ACCESS_KEY` 不应复用网站运行时的只读凭据。上传后按文章清单抽样检查文件和 Range 播放。

后台网页上传使用独立的 `R2_BBC_AUDIO_UPLOAD_ACCESS_KEY_ID` 和 `R2_BBC_AUDIO_UPLOAD_SECRET_ACCESS_KEY`，权限为仅限此桶的 Object Read & Write。音频读取继续使用上面的只读凭据；预签名上传地址不能由只读令牌签发。

后台上传会自动配对中英文段落、提取词汇，并把提供的逐句语法标注映射到正文；未提供的句子由现有语法分析器补齐。随后在浏览器中用 Whisper base 识别词级时间、核对句首句尾和句间停顿，使用与原流程相同的 libmp3lame q2 编码生成独立 MP3。新文章形成可预览草稿，沿用现有发布操作。

完整原声和全部小音频上传并核验后，才能保存文章。小音频路径为 `bbc/{year}/{articleId}/sentences/{originalRevision}/{articleId}-{sentenceNo}.mp3`，其中句号保留三位；替换原声时使用新的 revision，避免中途失败影响原有文件。页面内重试保留已经完成的识别、切分和上传；只改词汇、中文或语法且英文分句不变时，保留原有逐句文件。

构建前由 `scripts/prepare-bbc-audio-encoder.mjs` 从安装依赖准备编码资源，部署自动执行此步骤。本地开发首次使用自动上传前可运行 `npm run bbc:audio:prepare`。核心资源由本站提供；模型沿用浏览器缓存。接口继续使用现有管理员验证、私有桶和 BBC 会员播放权限。

# BBC 音频上传与网站接入

当前本地 BBC 音频位置：

```text
/Users/shidianjin/ielts-platform/public/audio/bbc
```

当前规模约：

- 10621 个 mp3
- 约 2.0G
- 年份：2015–2025

## 推荐方案：Cloudflare R2

不要把全部 BBC 音频直接放进 GitHub/Vercel 部署包。音频体积大，应该放到对象存储或 CDN，网站只保存音频 URL。

当前选择 Cloudflare R2：

1. 在 Cloudflare R2 新建 Bucket，例如：

```text
englishjieyou-bbc-audio
```

2. 上传本地文件夹内容：

```text
public/audio/bbc/*
```

到 R2 的这个前缀：

```text
bbc/
```

3. 让 Bucket 可以公开读取。

推荐后期绑定自定义音频域名：

```text
https://audio.englishjieyou.cn
```

如果先测试，也可以用 Cloudflare 提供的公开 R2 地址。

4. Vercel 环境变量：

```text
NEXT_PUBLIC_BBC_AUDIO_BASE_URL=https://audio.englishjieyou.cn/bbc
```

如果先使用 Cloudflare 的公开 R2 地址，则把前半段换成 Cloudflare 给出的公开地址，例如：

```text
NEXT_PUBLIC_BBC_AUDIO_BASE_URL=https://pub-xxxx.r2.dev/bbc
```

5. 在 Vercel 里 Redeploy。

6. 验证：

```text
https://englishjieyou.cn/articles/220829
```

如果播放器能加载，说明外部音频已接通。

## 上传脚本

项目内提供了一个不依赖 AWS CLI / rclone 的上传脚本：

```text
scripts/upload-bbc-audio-to-r2.mjs
```

需要通过环境变量提供 Cloudflare R2 凭据：

```text
R2_ACCOUNT_ID=你的 Cloudflare Account ID
R2_ACCESS_KEY_ID=你的 R2 Access Key ID
R2_SECRET_ACCESS_KEY=你的 R2 Secret Access Key
R2_BUCKET=englishjieyou-bbc-audio
node scripts/upload-bbc-audio-to-r2.mjs
```

不要把密钥写进代码、文档或聊天记录。用本地终端临时环境变量，或者用隐藏输入脚本。

## 当前代码逻辑

`src/lib/articles/bbc.ts` 会读取 `NEXT_PUBLIC_BBC_AUDIO_BASE_URL`：

- 没有设置时：只使用当前已经随网站发布的 2015 年音频。
- 设置后：启用 2015–2025 全部 BBC 文章，并把音频地址指向外部存储。

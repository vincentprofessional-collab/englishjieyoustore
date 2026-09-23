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

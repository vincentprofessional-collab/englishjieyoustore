# BBC R2 article uploads

The admin upload page sends MP3 bytes directly from the browser to the private Cloudflare R2 bucket using a short-lived signed URL. The Next.js server never receives the audio body.

## One-time setup

1. Apply `supabase/026_bbc_uploaded_articles.sql` in the Supabase SQL Editor.
2. Make sure the production environment has `R2_ACCOUNT_ID`, `R2_BBC_AUDIO_UPLOAD_ACCESS_KEY_ID`, `R2_BBC_AUDIO_UPLOAD_SECRET_ACCESS_KEY`, `R2_BBC_AUDIO_BUCKET` (optional; defaults to `englishjieyou-bbc-audio`), and the existing Supabase service key. The upload token needs **Object Read & Write**, scoped only to this bucket. Keep the separate `R2_BBC_AUDIO_ACCESS_KEY_ID` and `R2_BBC_AUDIO_SECRET_ACCESS_KEY` credentials **Object Read only** for paid playback. Generating a signed URL with the playback token succeeds locally but the subsequent upload is rejected by R2 with HTTP 403, which browsers may report as a CORS error.
3. In the R2 bucket settings, add this CORS rule so the browser can make the signed `PUT` request:

```json
[
  {
    "AllowedOrigins": [
      "https://www.englishjieyou.cn",
      "https://englishjieyou.cn",
      "http://localhost:3000"
    ],
    "AllowedMethods": ["PUT", "HEAD"],
    "AllowedHeaders": ["Content-Type"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3600
  }
]
```

BBC audio stays private in R2. The existing `/api/bbc-audio/...` route streams it only after the BBC membership check.

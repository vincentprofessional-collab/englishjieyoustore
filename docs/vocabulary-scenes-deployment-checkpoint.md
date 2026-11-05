# 场景图片接入检查点

235组最终图/4699教学词卡元数据已导入。私有Supabase桶265个对象已上传，涵盖235张最终底图和30张旧预览；508919536字节，按对象路径/长度/MD5的整体指纹19647abc874a9474529ebf6e725e2e41与本地完全一致。旧本地图片副本已在确认迁移后移除，next.config不再打包图片。签名URL直达Storage，旧API仅重定向。

四种交互、TypeScript、9项自动测试及11项浏览器检查已通过。默认反应5秒/详情10秒，口语使用自己的计时。粉色飘带标题始终显示，沿用英美词音。

2026-11-06最新交接范围：本轮仅admin开放；访客、普通和付费账户均显示“暂未达到上线质量标准”。服务端页面、元数据API和旧图片API共用admin校验。购买入口已从场景页面移除。

生产数据库已应用`supabase/migrations/20261106000000_vocabulary_scene_images_admin_preview.sql`。2026-11-06回读确认`vocabulary.scene-images`项目与`lifetime`方案均为关闭，价格记录29.90保留、实际可购金额为`null`；未发现该项目的权益记录。购买已停用，场景仍仅向admin开放。

统一工作树`72e124f`已通过完整`npm run build`并进入`origin/main`，本次部署已成功。详细文件与验证范围见`docs/vocabulary-scenes-handoff.md`。

# TODO 待办清单

- [] 连接2000@sip.weiyuai.cn，实现语音对话
- [x] 拨打5000@sip.weiyuai.cn，实现IVR测试
- [x] 在cicd文件夹创建一个脚本，首先执行 pnpm build-demo，然后使用rsa的方式 将demo文件夹所有内容 上传到 服务器14.103.165.199 目录 /var/www/html/sip_demo 中
- [x] 解释一下 注册有效期，并实现自动续期

说明：
- 注册有效期（Expires）由服务器在 REGISTER 200 OK 中返回，通常在 Contact 头部的 expires 参数（或 Expires 头）。
- Demo 会解析该秒数并显示“剩余秒数/到期时间”，每秒实时倒计时。
- 通过 SimpleUserOptions.registererOptions.refreshFrequency=95，让 SIP.js 在到期前自动 re-REGISTER，保持在线。
- 注销或断开会清理倒计时与显示。

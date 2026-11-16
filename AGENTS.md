# 项目执行约定

- src 是页面和共享逻辑真源，app/server.js 为服务入口；修改后 node tools/build.js。
- 生成物随源码交付，由 node tools/build.js --check 校验；不要只改生成页面。
- 验证：npm run check、npm test、npm run test:security、npm run guard。
- 数据/配置/密钥/课堂录屏不得提交。所有测试数据放 .tmp，产物放 .artifacts。
- 发布前检查 Git 暂存区及历史；guard 只提供确定性辅助，不替代审查。
- 不依赖作者账号、本机 CLI 或私人网关。未配模型应明确失败，模拟必须标注。

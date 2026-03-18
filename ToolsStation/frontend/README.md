# ToolsStation Frontend

Next.js 前端应用，提供资讯浏览界面与交互能力。与后端通过 REST API 通信。

## 运行步骤

```bash
cd frontend

# 安装依赖
npm ci

# 配置公开环境变量
# 创建 .env.local 并写入：
# NEXT_PUBLIC_API_URL=http://localhost:8000

# 启动开发服务器
npm run dev
```

## 构建与部署

```bash
# 生产构建
npm run build

# 启动生产服务
npm run start
```

## 注意

- 前端仅使用公开变量（NEXT_PUBLIC_*）；服务端密钥由后端进程管理
- 默认后端地址为 http://localhost:8000，可在 .env.local 中调整

# AI Project Collection

本仓库包含两个独立部署的工程模块，分别面向创作与资讯聚合场景。整体采用前后端分离与脚本化环境配置，强调安全与可维护性。

## 模块概览

- AI_Novel：多智能体驱动的小说创作平台  
  功能：大纲与章节生成、风格辅助、世界观管理  
  技术：React、TypeScript、Vite、Supabase、Node.js

- ToolsStation：资讯抓取、摘要与推送平台  
  功能：多源抓取、LLM摘要、飞书/微信推送、Web展示  
  技术：FastAPI、Next.js、SQLAlchemy、APScheduler

- A-Pet（未开发完全，待后续完善）：桌面 AI 宠物原型  
  目标：动画与交互、状态与记忆、场景感知、对话与任务  
  现状：原型代码与资源已初步搭建，功能尚未完备，后续补齐

## 部署与运行方式

两套业务独立运行，分别在各自目录进行开发与启动：

- AI_Novel：详见 [AI_Novel/README.md](./AI_Novel/README.md)
- ToolsStation：详见 [ToolsStation/README.md](./ToolsStation/README.md)

## 环境变量与安全

- 服务器端密钥采用系统环境变量管理，示例脚本：scripts/setup_env_example.ps1  
  请使用本机私有脚本 scripts/local/setup_env.ps1（已被忽略提交）设置真实值
- 前端仅保留必要的公开变量（如 VITE_SUPABASE_ANON_KEY、NEXT_PUBLIC_API_URL）
- 严禁将服务端密钥写入前端环境或提交至仓库

## 目录结构

```
AI-Project/
├── A-Pet/             # 桌面 AI 宠物原型（未完成，待完善）
│   ├── src/           # Python 源码（状态、记忆、动画、UI）
│   ├── assets/        # 2D/3D 资源
│   └── requirements.txt
├── AI_Novel/
│   ├── api/           # Node.js 服务
│   ├── src/           # 前端应用
│   └── README.md
├── ToolsStation/
│   ├── backend/       # FastAPI 服务
│   ├── frontend/      # Next.js 应用
│   └── README.md
└── scripts/           # 脚本（示例与私有）
```

## 贡献与许可证

- 贡献流程：Fork → 分支开发 → 提交 PR
- 许可证：MIT License

# ToolsStation Backend

FastAPI 后端服务，提供资讯抓取、摘要与推送能力。建议本地分离运行，并通过系统环境变量管理敏感配置。

## 运行步骤

```bash
cd backend

# 安装依赖
python -m pip install -r requirements.txt

# 初始化数据库（SQLite 默认）
python init_db_script.py

# 启动服务
python -m uvicorn main:app --reload --port 8000
```

## 环境变量（系统级）

- OPENAI_API_KEY：LLM 摘要密钥
- OPENAI_BASE_URL：自定义 API 地址（如 DeepSeek）
- OPENAI_MODEL：模型名称
- FEISHU_WEBHOOK_URL：飞书机器人 Webhook

设置方式建议使用仓库提供的示例脚本（替换占位），或本机私有脚本：

- 示例脚本：`../../scripts/setup_env_example.ps1`
- 私有脚本：`../../scripts/local/setup_env.ps1`（已忽略提交）

## 接口说明

- GET `/`：健康检查与欢迎信息
- GET `/api/v1/news`：获取新闻列表（支持 source 与 limit 参数）
- POST `/api/v1/trigger-update`：手动触发抓取与处理流程
- POST `/api/v1/notify`：手动触发通知推送

## 注意

- 请勿将任何服务器端密钥写入 .env 或提交仓库
- 若切换到 PostgreSQL，请调整 `database.py` 连接配置并管理相应凭证

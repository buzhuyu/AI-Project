<# 
用途：仓库可提交的示例脚本（不含真实密钥），用于一键设置本机“用户级”环境变量。 
使用：在填写占位符后，右键“用 PowerShell 运行”，或在终端执行：
  pwsh ./scripts/setup_env_example.ps1
注意：请用真实值替换所有 <REPLACE_WITH_...> 占位符；本脚本不会回显密钥具体值。 
#>

param(
  [ValidateSet('User','Machine')]
  [string]$Scope = 'User'
)

$vars = @{
  # Supabase 服务端密钥（仅服务器端使用，绝不可放前端）
  'SUPABASE_SERVICE_ROLE_KEY' = '<REPLACE_WITH_YOUR_SUPABASE_SERVICE_ROLE_KEY>';

  # DeepSeek 配置（仅服务器端使用）
  'DEEPSEEK_API_KEY'          = '<REPLACE_WITH_YOUR_DEEPSEEK_API_KEY>';
  'DEEPSEEK_BASE_URL'         = 'https://api.deepseek.com';

  # OpenAI 兼容接口（仅服务器端使用）
  'OPENAI_API_KEY'            = '<REPLACE_WITH_YOUR_OPENAI_API_KEY>';
  'OPENAI_BASE_URL'           = 'https://api.deepseek.com';
  'OPENAI_MODEL'              = 'DeepSeek-V3.2';

  # 飞书机器人 Webhook（敏感，避免泄露）
  'FEISHU_WEBHOOK_URL'        = '<REPLACE_WITH_YOUR_FEISHU_WEBHOOK_URL>';
}

Write-Output "Setting environment variables (Scope=$Scope)..."
foreach ($k in $vars.Keys) {
  $v = $vars[$k]
  if ($v -match '^<REPLACE_WITH_') {
    Write-Output "$k=PLACEHOLDER (not set)"
  } else {
    [Environment]::SetEnvironmentVariable($k, $v, $Scope)
    Write-Output "$k=SET"
  }
}

Write-Output "Done. Restart your shell/apps if they need to read new env."

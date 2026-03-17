# A-Pet Initialization Spec

## Why
基于《桌面AI宠物养成设计》调研报告，用户需要一款高品质、可视化、智能且具有养成成就感的桌面 AI 宠物。旨在通过简单的交互和深度的情感连接，为用户提供陪伴感和新鲜感，而非功能的堆砌。

## What Changes
- 初始化 `A-Pet` 项目结构。
- 建立基于 Python 和 PyQt6 的桌面应用程序框架。
- 实现核心的可视化宠物窗口（透明、无边框、置顶）。
- 集成 AI 对话能力（LLM API）与养成系统（状态管理）。
- 实现高品质的交互动画与 UI 反馈。

## Impact
- **Affected specs**: 新项目初始化。
- **Affected code**: 创建项目根目录下的所有核心文件。

## ADDED Requirements
### Requirement: 可视化桌面宠物
The system SHALL provide a desktop application that:
- 显示一个无边框、背景透明的宠物形象。
- 始终置顶显示（可配置）。
- 支持鼠标拖拽移动位置。
- 支持播放 GIF 或序列帧动画（待机、互动、移动等状态）。

### Requirement: 智能对话与交互
The system SHALL:
- 集成 LLM API (如 OpenAI/DeepSeek 接口) 进行自然语言对话。
- 具备角色扮演能力（Prompt Engineering），保持“萌”的性格。
- 支持上下文记忆，让对话具有连续性。
- 提供可视化对话气泡，随宠物移动。

### Requirement: 养成与状态系统
The system SHALL:
- 维护宠物的核心状态：饥饿度 (Hunger)、心情 (Mood)、体力 (Energy)。
- 状态随时间自动衰减，需用户通过交互（喂食、抚摸、玩耍）恢复。
- 状态影响宠物的行为（如饿了会无精打采，心情好会主动说话）。
- 数据需本地持久化保存。

### Requirement: 品质与细节
The system SHALL:
- 交互流畅，无卡顿。
- UI 设计精美（气泡、菜单）。
- 资源占用合理。

## Tech Stack
- **Language**: Python 3.10+
- **GUI Framework**: PyQt6 (成熟、稳定、支持异形窗口)
- **AI Integration**: `openai` library (兼容多种 LLM API)
- **Assets Handling**: `Pillow`
- **Data Storage**: JSON (轻量级配置与状态存储)

## MCP & Tools
- **MCP**: 无需额外 MCP，使用内置文件系统工具即可。
- **Tools**:
  - Python environment
  - PyQt6 Designer (可选，建议代码构建 UI 以保持灵活性)

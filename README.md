# 与道对话

基于 Vite 的历史思想人物对话网站。页面包含星空背景、扁平环形人物相册、对话记录、人物管理和模型设置。

## 本地开发

需要 Node.js 和 npm：

```sh
npm install
npm run dev
```

生产构建：

```sh
npm run build
npm run preview
```

## 模型配置

在网站的设置面板填写 DeepSeek API Key。当前模型配置为 DeepSeek V4.1 Flash；密钥和对话记录保存在当前浏览器的 `localStorage`。

## 项目结构

- `src/`：前端逻辑、人物名单、会话示例和肖像信息。
- `portraits/`：本地肖像资源。
- `scripts/`：肖像资源整理与生成脚本。
- `index.html`、`styles.css`：页面结构和样式。

依赖目录 `node_modules/` 与构建输出 `dist/` 不纳入 Git，可通过 npm 命令重新生成。

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

## 人物头像

1000 位人物均有本地头像。优先使用 `src/portraitCredits.js` 中记录来源及许可的历史肖像、传统绘像或雕像照片；没有可靠资源的条目使用 `portraits/original/` 中按姓名、地区及角色生成的原创 SVG 示意插画。原创插画在相册及人物管理中明确标注，不代表人物的真实或历史面貌。

`npm run portraits:download` 可继续从维基百科条目和 Wikimedia Commons 下载有许可的对应形象（支持已下载资源续跑，遇到限流会退避）。`npm run portraits:generate` 重新生成本地原创插画；`npm run portraits:verify` 检查 1000 位人物的文件、图片格式和来源记录，更新 `portraits/coverage.json` 及缺失清单。

图片加载失败时会自动回退到原创示意插画，自定义人物也有独立生成的示意头像。

校验结果中的 `sourced` 才是已经取得对应网上形象的数量，`original` 只是示意图兜底。`portraits/needs-sourced-portrait.json` 会单独列出仍未补齐对应形象的人物，`portraits/sourcing-audit.json` 记录最近一轮逐项检索及下载结果；不能把“文件可加载”当作“人物形象已补齐”。

目前已扩展到博物馆、美术馆和普通网页图片。网络图片的网页来源、许可状态及组合图的各部分来源记录在 `src/portraitCredits.js` 中；没有确认许可的网页图片如实标注“许可未核实”。组合人物使用对应人物的组合图。生产构建会将实际使用的头像复制到 `dist/portraits/`，无需依赖在线图片服务。

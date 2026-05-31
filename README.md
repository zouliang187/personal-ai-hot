# AI Hot

AI Hot 是一个开源的 AI 热点新闻聚合站。它从精选 RSS 信源抓取内容，用可解释的规则为信息打分、去重和分组，再发布为一个轻量的静态网页，方便快速浏览模型、产品、研究和行业动态。

在线访问：[zouliang187.github.io/personal-ai-hot](https://zouliang187.github.io/personal-ai-hot/)

## 项目目标

- 聚合高质量 AI 信源，减少重复刷新闻的时间。
- 用透明的规则完成评分、分层和筛选，避免黑盒推荐。
- 输出适合日常阅读的精选列表、时间线、日报和信源分级。
- 保持纯静态部署，降低运行和维护成本。

## 当前功能

- 从 `sources.json` 中配置的 RSS 信源抓取最新条目。
- 根据来源等级、发布时间、关键词、主题类别和标题质量生成综合分数。
- 对相同或相近标题做基础聚类，保留相关报道入口。
- 生成 `data/news.json`，前端直接读取并渲染页面。
- 支持精选信息、完整时间线、AI 日报和信源管理四个视图。
- 支持按主题筛选和全文搜索。

## 本地运行

```bash
npm install
npm run update
npm run serve
```

打开 `http://127.0.0.1:4173`。

## 常用命令

```bash
npm run update   # 抓取 RSS 并生成 data/news.json
npm run serve    # 本地预览静态站点
npm run build    # 当前等同于 npm run update
```

## 调整信源

编辑 `sources.json`，可以增加或删除 RSS 信源。每个信源包含：

- `name`：页面展示名称。
- `url`：RSS 地址。
- `tier`：来源等级，支持 `T1`、`T1.5`、`T2`。
- `kind`：来源类型，例如 `official`、`platform`、`research`。
- `category`：默认主题，支持 `model`、`product`、`industry`、`research`。

`tier` 会影响基础分和精选阈值。官方来源通常适合放在 `T1`，平台或社区来源适合 `T1.5`，研究类聚合源可放在 `T2`。

## 部署

当前版本使用 GitHub Pages 的 `gh-pages` 分支托管。更新数据后，把静态文件发布到 `gh-pages` 分支即可。

```bash
npm run update
git add data/news.json
git commit -m "Update AI Hot data"
git push
```

后续计划加入 GitHub Actions，让站点按固定时间自动更新。

## Roadmap

详见 [ROADMAP.md](ROADMAP.md)。优先方向包括自动化更新、更多信源、摘要质量改进、测试覆盖和贡献者文档。

## 贡献

欢迎提交 issue 或 pull request，尤其是：

- 推荐新的高质量 AI RSS 信源。
- 改进评分、去重、分类和摘要逻辑。
- 修复页面展示或移动端体验问题。
- 补充文档、示例和自动化工作流。

请先阅读 [CONTRIBUTING.md](CONTRIBUTING.md)。

## 许可证

本项目基于 [MIT License](LICENSE) 开源。

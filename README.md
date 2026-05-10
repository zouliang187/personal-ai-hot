# AI Hot

一个个人 AI 热点新闻站，思路来自 AIHOT：用精选信源做底座，用可解释的代码评分和阈值筛选信息，再用页面呈现精选、时间线、日报和信源分级。

## 本地运行

```bash
npm install
npm run update
npm run serve
```

打开 `http://127.0.0.1:4173`。

## 部署

当前版本使用 GitHub Pages 的 `gh-pages` 分支托管。更新数据后，把静态文件发布到 `gh-pages` 分支即可。

```bash
npm run update
git add data/news.json
git commit -m "Update AI Hot data"
git push
```

如果要每天北京时间 08:00 自动更新，可以再给 GitHub CLI 补 `workflow` 权限，然后添加 GitHub Actions 工作流。

## 调整信源

编辑 `sources.json`，可以增加或删除 RSS 信源。`tier` 支持 `T1`、`T1.5`、`T2`，分数和精选阈值会根据等级自动调整。

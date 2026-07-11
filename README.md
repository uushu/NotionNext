<div align="center">

# utto兔子的学习屋

一个基于 **NotionNext + Notion + Vercel** 搭建的长期个人博客。

记录游戏开发、编程学习、课程复习、项目实践、实习成长和日常内容。

[访问博客](https://notion-next-btu6.vercel.app) · [查看上游项目](https://github.com/notionnext-org/NotionNext)

</div>

---

## 项目定位

“utto兔子的学习屋”不是虚构角色博客，而是作者 `utto` 的长期公开学习档案。

Utto 兔子作为博客视觉形象，保留白色软团状身体、头身一体、短粗耳朵、暖棕手绘描边、淡粉腮红、圆点眼睛和双圆嘴，用于灵宠、404 页面和站点视觉统一。

内容按以下分类长期整理：

- 开发记录
- 学习笔记
- 期末速通
- 技术分享
- 日常记录

## 技术架构

| 模块 | 方案 |
| --- | --- |
| 内容后台 | Notion |
| 前端框架 | NotionNext / Next.js |
| 当前主题 | Claude |
| 代码与静态素材 | GitHub |
| 预览与生产部署 | Vercel |
| 正式分支 | `main` |
| 长期开发分支 | `v1` |

## 当前功能

- Claude 主题首页与博客品牌信息
- Notion README 页面渲染与打字机效果
- 分类、标签卡片样式
- 文章页返回所属分类导航
- 自定义 favicon
- 自定义 Utto 404 页面
- Claude 风格暖色点击反馈
- 页面访问量展示
- 官方文章数据驱动的热力贡献图
- 可拖动的 Utto 灵宠
- 灵宠首页、阅读、探索、空闲、休息、睡眠、互动、连续点击、阅读完成和错误状态
- 灵宠位置与折叠状态本地保存
- GIF 构建减速与素材完整性审计

## 灵宠目录

```text
components/pet/utto/   组件、配置、状态和样式
public/pet/utto/       GIF、PNG、WebP 等静态素材
scripts/pet/           素材审计与 GIF 处理脚本
```

灵宠状态统一由：

```text
components/pet/utto/pet.manifest.json
```

管理。

`public/pet/utto/slow/` 属于构建产物，不提交到 Git。

## 本地开发

推荐使用 Node.js 20 和 Yarn 1。

```bash
yarn
yarn dev
```

构建生产版本：

```bash
yarn build
```

单独检查灵宠素材：

```bash
node scripts/pet/audit-utto-assets.js
```

生成减速 GIF：

```bash
node scripts/pet/prepare-utto-gifs.js
```

## 开发与发布流程

### 内容发布

```text
Notion Draft
→ 检查属性与正文
→ Published
```

### 代码发布

```text
v1 修改
→ Vercel Preview
→ 完整回归测试
→ 合并 main
→ Vercel Production
```

开发约束：

1. 所有试验性修改只进入 `v1`。
2. `main` 只对应稳定生产版本。
3. 同一对象直接覆盖原文件，不创建 `old`、`v2`、`final` 等副本。
4. 历史版本通过 Git 提交、分支和标签保存。
5. Notion 管理文章正文，GitHub 不保存重复文章内容。
6. 新增或删除灵宠素材后必须执行素材审计。

## 当前重点

- 接入自定义域名
- 继续统一 Utto 原始 IP 形象
- 扩展灵宠自主移动、投喂、需求和页面互动
- 增加真实项目文章与游戏 Demo 展示
- 持续完善移动端体验与内容结构

## 自定义文件说明

相对 NotionNext 上游项目的主要改动记录在：

[查看 CUSTOMIZATIONS.md](./CUSTOMIZATIONS.md)

## 上游项目

本项目基于开源项目 [NotionNext](https://github.com/notionnext-org/NotionNext) 二次开发。

NotionNext 负责 Notion 内容解析、主题系统、站点构建及通用博客能力；本仓库主要维护“utto兔子的学习屋”的品牌、页面交互、灵宠和部署配置。

## License

沿用 NotionNext 的 MIT License。

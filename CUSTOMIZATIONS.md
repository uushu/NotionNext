# utto 的学习屋：自定义文件清单

该文件记录相对 NotionNext 上游模板新增或重点修改的项目文件，便于清理、迁移和后续维护。

## 1. 灵宠模块

### 运行代码

```text
components/pet/penpen/
├── index.js
├── PenpenPet.js
├── PetStyles.js
├── pet.config.js
├── pet.needs.js
├── pet.utils.js
├── pet.manifest.json
└── README.md
```

### 原始素材

```text
public/pet/penpen/
├── idle.gif
├── reading.gif
├── exploring.gif
├── bored.gif
├── break.gif
├── sleep.gif
├── interact.gif
├── annoyed.gif
├── success.gif
├── fatal-error.webp
├── fatal-error.png
└── README.md
```

### 工具

```text
scripts/pet/prepare-penpen-gifs.js
scripts/pet/audit-penpen-assets.js
```

### 生成文件

```text
public/pet/penpen/slow/
```

该目录由构建脚本生成，已加入 `.gitignore`，不提交到仓库。

## 2. README 首页效果

```text
components/ReadmeTypewriter.js
pages/_app.js
```

`pages/_app.js` 同时负责挂载 Claude 主题、README 动画、点击反馈和灵宠。

## 3. 页面交互与视觉

```text
components/ClickGlassRipple.js
styles/claude-category-cards.css
styles/claude-category-overrides.css
pages/404.js
```

其中：

- `claude-category-cards.css`：分类和标签卡片主体样式。
- `claude-category-overrides.css`：兼容旧 Link DOM 结构的覆盖规则，不是无意义重复。
- `pages/404.js`：使用 Utto 的 404 页面。

## 4. 品牌与站点配置

```text
public/utto-favicon.svg
blog.config.js
themes/claude/config.js
```

## 5. 必须保留的成对素材

```text
fatal-error.webp
fatal-error.png
```

WebP 是优先加载版本，PNG 是兼容回退版本，不应删除其中任意一个。

## 6. 已清理项目

```text
components/UttoPet.js                 已由 components/pet/penpen/PenpenPet.js 取代
scripts/prepare-utto-gifs.js          已由 scripts/pet/prepare-penpen-gifs.js 取代
public/pet/utto/manifest.json          与组件 manifest 重复，已删除
public/pet/utto/slow/                  旧生成目录已由 penpen/slow/ 取代
```

## 7. 迁移灵宠所需最小集合

复制：

```text
components/pet/penpen/
public/pet/penpen/
scripts/pet/
```

并在目标项目中：

1. 安装 `sharp`。
2. 构建前执行 `node scripts/pet/prepare-penpen-gifs.js`。
3. 从 `components/pet/penpen` 引入组件。
4. 执行 `node scripts/pet/audit-penpen-assets.js` 检查素材完整性。

## 8. 维护规则

- 新动画只在 `pet.manifest.json` 登记一次。
- 原始动画放入 `public/pet/penpen/`。
- 不提交 `slow/`、临时帧、测试导出和失败稿。
- 测试动画确认可用后再使用正式名称上传。
- 删除素材前先执行资产审计，并检查 manifest 和页面引用。

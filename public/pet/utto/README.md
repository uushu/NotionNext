# Utto 素材目录

该目录只保存网页运行时需要的 Utto 原始素材。动画状态由 `components/pet/utto/pet.manifest.json` 统一管理。

## 当前素材

### 循环或状态动画

```text
idle.gif        默认待机
reading.gif     阅读文章
exploring.gif   浏览分类、标签、搜索等页面
bored.gif       长时间无操作
break.gif       休息
sleep.gif       页面隐藏或长时间无操作
interact.gif    单击互动
annoyed.gif     连续点击后的反应
success.gif     阅读到文章底部
```

### 静态插图

```text
fatal-error.webp   404 页面与 fatalError 状态的优化版本
fatal-error.png    WebP 加载失败时的回退源
```

两个 `fatal-error` 文件用途不同，不属于无意义重复。

## 生成目录

```text
slow/
```

该目录由 `scripts/pet/prepare-utto-gifs.js` 在开发和构建前自动生成，不应提交到 Git。

## 添加素材

1. 使用透明背景。
2. 推荐统一为 `120 × 120` 画布。
3. 循环动作保持角色锚点稳定。
4. 将文件名登记到 `components/pet/utto/pet.manifest.json`。
5. 不要手动上传 `slow/` 中的文件。

## 计划中的扩展动作

```text
walk.gif
climb.gif
corner-turn.gif
hide.gif
appear.gif
peek.gif
hungry.gif
eat.gif
mischief.gif
run.gif
```

这些文件尚未加入仓库，避免用测试稿或从现有 GIF 截取的角色帧占位。

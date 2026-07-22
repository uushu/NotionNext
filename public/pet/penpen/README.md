# penpen 素材目录

该目录只保存兔子灵宠 penpen 的网页运行时原始素材。状态、文件路径和生成规则由 `components/pet/penpen/pet.manifest.json` 统一管理。

## 当前素材

```text
idle.gif          默认待机
reading.gif       阅读文章
exploring.gif     浏览或自主移动
bored.gif         发呆，也用于低饱腹提示
break.gif         休息
sleep.gif         睡眠
interact.gif      单击、抚摸互动
annoyed.gif       连续点击后的反应
success.gif       投喂或阅读完成反馈
fatal-error.webp  404 插图优化版本
fatal-error.png   404 插图回退源
```

所有素材使用同一 penpen 形象。两个 `fatal-error` 文件用途不同，不属于无意义重复。

## 生成目录

`slow/` 由 `scripts/pet/prepare-penpen-gifs.js` 在开发和构建前生成，不提交 Git。

## 添加素材

1. 使用透明背景和稳定锚点，推荐统一为 `120 × 120`。
2. 保持 penpen 的头身一体结构、短耳、暖棕描边、粉腮与双圆嘴。
3. 将文件登记到 `components/pet/penpen/pet.manifest.json`。
4. 不手动上传 `slow/` 中的构建产物。

## 后续可补动作

```text
walk.gif
eat.gif
hungry.gif
peek.gif
hide.gif
appear.gif
```

在正式素材完成前，继续复用已登记动画，不从现有 GIF 截图伪造占位素材。

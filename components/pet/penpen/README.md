# penpen 灵宠模块

该目录是兔子灵宠 penpen 的完整运行模块。Utto 是博客作者与主人，penpen 是陪伴 Utto 和访客的兔子；代码、文案和素材不得再把二者混为同一角色。

## 目录

```text
components/pet/penpen/
├── index.js             模块统一入口
├── PenpenPet.js         移动、互动、拖动和页面感知逻辑
├── PetStyles.js         灵宠与照顾面板样式
├── pet.config.js        根据 manifest 生成运行时配置
├── pet.needs.js         需求值、衰减和照顾行为
├── pet.utils.js         路由、位置和自主移动计算
├── pet.manifest.json    动画、文案、需求值和移动参数的唯一配置源
└── README.md            本说明
```

对应原始素材位于 `public/pet/penpen/`，构建脚本位于 `scripts/pet/`。

## 已有能力

- 页面状态：待机、阅读、探索、404。
- 空闲状态：发呆、休息、睡眠。
- 页面互动：点击反馈、连续点击提醒、阅读到底庆祝。
- 自主行为：在页面下部低频移动，移动期间使用探索动画。
- 照顾系统：饱腹、心情、精力、亲密度，以及投喂、摸摸、休息。
- 本地记忆：位置、收起状态和需求值保存在浏览器本地。
- 无障碍：键盘焦点、进度值和“减少动态效果”设置。

## 新增动画

1. 将透明背景素材放入 `public/pet/penpen/`。
2. 在 `pet.manifest.json` 的 `states` 中登记状态。
3. 需要生成慢速版时设置 `generateSlow: true`。
4. 在 `PenpenPet.js` 的行为逻辑中切换到该状态。
5. 执行 `npm run pet:audit`。

构建时会把慢速 GIF 写入 `public/pet/penpen/slow/`。`slow/` 是构建产物，不提交 Git。

## 素材规范

- 角色固定为 penpen：白色软团状身体、头身一体、短粗耳朵、暖棕手绘描边、淡粉腮红、圆点眼睛和双圆嘴。
- 推荐画布 `120 × 120`，背景透明，角色锚点为脚底中心。
- 循环动作必须首尾衔接；GIF 内只做原地动作，页面位移交给代码。
- 文件名使用小写英文和短横线；静态插图优先 WebP，并保留 PNG 回退源。

## 迁移

至少复制：

```text
components/pet/penpen/
public/pet/penpen/
scripts/pet/audit-penpen-assets.js
scripts/pet/prepare-penpen-gifs.js
```

目标项目需安装 `sharp`，构建前运行两个脚本，并从 `components/pet/penpen` 引入组件。

# Utto 灵宠模块

该目录是 Utto 网页灵宠的完整运行模块。组件代码、状态配置、动画清单和迁移说明集中维护，避免以后新增动作时同时修改多个零散文件。

## 目录

```text
components/pet/utto/
├── index.js             模块统一入口
├── UttoPet.js           交互、状态切换和拖动逻辑
├── PetStyles.js         灵宠样式
├── pet.config.js        根据 manifest 生成运行时配置
├── pet.utils.js         路由判断和位置计算
├── pet.manifest.json    动画、文案和空闲状态的唯一配置源
└── README.md            本说明
```

对应素材位于：

```text
public/pet/utto/
```

构建脚本位于：

```text
scripts/pet/prepare-utto-gifs.js
```

## 新增一个动画

1. 将透明背景 GIF 放入 `public/pet/utto/`。
2. 在 `pet.manifest.json` 的 `states` 中新增状态。
3. 需要生成慢速版时设置 `generateSlow: true`。
4. 在 `UttoPet.js` 的行为逻辑中切换到该状态。

示例：

```json
"hungry": {
  "file": "hungry.gif",
  "label": "有点饿了",
  "generateSlow": false
}
```

构建时会自动读取 manifest，将需要降速的 GIF 写入：

```text
public/pet/utto/slow/
```

`slow/` 是生成目录，不提交到 Git。

## 素材规范

- 推荐画布：`120 × 120`
- 背景：透明
- 角色锚点：脚底中心
- 循环动作必须首尾衔接
- GIF 内只做原地动作，页面位移交给代码
- 文件名使用小写英文和短横线
- 静态插图优先 WebP，并保留 PNG 回退源

## 迁移到其他项目

至少复制以下内容：

```text
components/pet/utto/
public/pet/utto/
scripts/pet/prepare-utto-gifs.js
```

然后：

1. 安装 `sharp`。
2. 在目标项目构建前执行 `node scripts/pet/prepare-utto-gifs.js`。
3. 从 `components/pet/utto` 引入组件。
4. 按目标框架调整路由判断和全局样式注入方式。

## 设计原则

- 动画素材只负责表现，行为由代码决定。
- 所有动作名称和文件路径只在 manifest 中维护。
- 原始素材和生成素材严格分开。
- 不在组件中硬编码新增 GIF 文件名。

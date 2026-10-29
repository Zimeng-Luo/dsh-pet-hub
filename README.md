# DSH Pet Hub 0.1.1

面向 Windows 用户的 DSH 侧栏桌宠插件，目标宿主 **0.2.1-rc.3**。安装启用后，DSH 界面打开时自动恢复上次选择的桌宠，在侧栏底部常驻。

源码仓库：https://github.com/Zimeng-Luo/dsh-pet-hub

**直接下载预编译安装包：** [dsh-pet-hub-0.1.1.tgz](https://github.com/Zimeng-Luo/dsh-pet-hub/raw/refs/heads/main/downloads/dsh-pet-hub-0.1.1.tgz)。无需安装 Node 或自行构建，按下方桌面端说明安装。

## 使用仓库中的芙宁娜模型

请先升级到 **0.1.1**，再按 [芙宁娜模型配置](docs/芙宁娜模型配置.md) 导入 `example/芙宁娜猫猫版/芙宁娜猫猫版` 整个文件夹。该包的键鼠、键盘模式已用真实文件验证；无需手工转换编号图片或移动表情文件。

## 这一版做到了什么

- 标准 DSH bundle + Client Modules 插件，自带编译产物，安装时不需要构建。
- 注册到 `sidebar.footer.action`，默认排序 -1000，放在通常的余额 footer 条目之前；侧栏折叠时收起画布、保留管理入口。渲染区域占据布局空间，不依赖屏幕绝对坐标。
- 复用 BongoCat 旧版的 **easy-live2d 0.4.4 + Pixi.js 8.18.1** 运行链路，适配原模型加载、动作、表情、鼠标跟随、左右手和按键图片组合。
- ZIP / 文件夹导入，自动发现 model3 入口，多入口手动选择；保存资源、当前选择、高度、镜像和显隐。
- Mver 整包识别：读取 `config.json`，区分键鼠／键盘／手柄模型，按原按键组合显示编号图片，并保留跨模式表情引用；再次触发相同表情可恢复。
- 先准备新运行实例再替换旧实例；加载失败保留当前桌宠。刷新／重新打开界面后自动加载。
- 独立的 PNG、JPEG、GIF、WebP 图片适配器，用于接入已有图片挂件。
- 独立通知气泡和版本化扩展事件；可选读取现有小鲸鱼插件的余额与等待提示。

这是一版可以安装的运行适配插件。它移植 BongoCat 的 Web 运行链路到侧栏，**不会启动或嵌入你本机安装的 BongoCat.exe，也不是完整 BongoCat 原应用的所有功能迁移**。Mver 的资源、按键图片与表情配置已支持；系统全局输入、原生窗口参数、音频与网络控制尚未迁移。Cubism 2、其他 EXE、Spine 等仍需要另外的适配器。

## Windows 安装

### 官方 DSH 桌面客户端

1. 下载 `dsh-pet-hub-0.1.1.tgz` 到本机。
2. 在 DSH 的「插件 → 添加插件」中填写该文件的**完整本地路径**，例如：
   ```text
   C:/Users/你的用户名/Downloads/dsh-pet-hub-0.1.1.tgz
   ```
3. 安装并启用，完全退出并重新打开 DSH。
4. 侧栏底部出现桌宠区域，点击「管理」。

桌面版使用自己的 desktop profile；不要用下面的 web 命令给桌面版安装。本地安装入口若不接受 tgz 路径，可将源码 ZIP 解压，在添加插件中填写解压后的 `dsh-pet-hub` 目录完整路径，该目录已带 lib 构建文件。

### 通过命令启动的 DSH Web

在 PowerShell 中：

```powershell
dsh plugin --profile web add "C:/Users/你的用户名/Downloads/dsh-pet-hub-0.1.1.tgz"
dsh web
```

若实际使用其他 profile，应安装到启动时使用的那个 profile。此安装包没有 npm 运行时依赖，不需要从源码执行 prepare。

## 首次配置

1. 如果使用 Live2D，在「管理 → Live2D 运行支持」中选择官方 Cubism SDK for Web 的 `Core/live2dcubismcore.js` 或 `.min.js`。官方 SDK：https://www.live2d.com/en/sdk/download/web/ 。这是可执行脚本，只选择可信官方文件；Core 不随本插件分发，仅需首次配置。当前客户端若已经有 Core，则复用。
2. 选择你的 BongoCat ZIP，或先解压再选择整个资源文件夹。Mver 包应选择同时包含 `config.json` 和 `img` 的那一层，保留三个模式目录；包中的 exe、dll 不会被执行。
3. 多模型包在列表中选择入口，点击「使用」。动作和表情从模型声明中列出。
4. 调整高度、镜像。关闭管理面板；以后打开 DSH 会自动恢复。

图片桌宠不需要 Core。导入 Live2D 包后没有 Core 会保留该包，提示先完成运行支持配置；不会把模型纹理错误地当成桌宠。

## 资源约定与范围

支持 `*.model3.json` + `.moc3` + 纹理，以及模型声明的动作、表情、物理、姿态和音效引用。保留所有原始相对路径。模型引用在资源包内的 `../` 可正常解析，网络引用与越界路径会被拒绝。

BongoCat 的附加层按模型入口所在目录查找：

```text
角色/
├─ cat.model3.json
├─ cat.moc3
├─ textures/...
├─ motions/...
└─ resources/
   ├─ background.png
   ├─ left-keys/KeyA.png
   └─ right-keys/KeyJ.png
```

键图按原文件名映射物理按键，支持 F 键 → Fn、左右修饰键 → 通用键回退，同手只显示最后一个仍按下的键。失焦时复位。鼠标跟随和键鼠按下参数来自 **DSH 页面内** 的事件；目前没有系统级输入采集、手柄适配或自动按键推测。没有对应参数／键图的模型会保持自己的正常动画。

模型动作音效默认关闭，尚未提供音效配置。模型没有声明的待机、呼吸或特殊交互，不宣称自动补齐。当前版仅复用上述明确列出的链路。

ZIP 限制：256 MiB 压缩文件、512 MiB 解压总量、128 MiB 单文件、6000 项。不支持 ZIP64、分卷、加密、非 UTF-8 中文文件名和符号链接；遇到这些格式先解压后导入文件夹。文件夹导入仍有单文件与总量限制。

Mver 整包额外识别 `img/<mode>/cat_model/*.model3.json` 和根 `config.json`：

- `standard.hand`、`keyboard.lefthand/righthand`、对应的 keyboard 与 face 表，映射原编号图片与 Windows 虚拟键组合。
- `l2d_expression` 的首项用于清除表情，后续项目依序对应模型表情；重复组合键切回默认表情。
- 原始窗口宽高作为叠加图坐标比例；原生投影缩放、窗口置顶、网络、全局快捷键和手柄输入不在此适配范围。
- 0.1.0 已导入的资源库在升级后自动重建模式索引，保留包 ID 与当前选择。

## 数据与备份

资源、Core、当前选择、显示设置存于当前客户端／来源的 IndexedDB `dsh-pet-hub-v1`。重新打开同一客户端会恢复。桌面版与浏览器、不同端口、不同浏览器的资源库互不共享；清理站点数据会删除资源库。请保留原 ZIP，管理面板也支持逐包「导出」。插件没有上传模型、输入事件、API Key 的逻辑。

卸载插件不会主动删除浏览器资源库；重新安装同名插件且使用同一来源可继续使用。不要依靠卸载替代备份。

## 小鲸鱼桥接与后续能力迁移

管理面板中的「接收小鲸鱼余额与等待提示」默认关闭。启用后每 10 秒在页面可见时读取同源的：

- `dsh-whale/balance.json`：`{ok:true,totalBalance:number,currency:string}`。
- `dsh-whale/wait.json`：`{ok:true,pending:{kind:'question'|'approval',id,ts}|null}`。

沿用当前 DSH 会话鉴权；不读取或存储鲸鱼插件的凭据。余额变化与新的等待项显示为当前桌宠的气泡。路由不可用或版本格式不同会显示错误，可以随时关闭桥接。**这不是完整迁移**，现有小鲸鱼插件需要继续安装；任务完成、记账面板、音效配置等后续逐项迁移。

其他可信前端插件可以发送：

```js
window.dispatchEvent(new CustomEvent('dsh-pet:notify', {
  detail: {
    version: 1,
    kind: 'completed', // info / completed / question / approval / balance
    text: '本轮任务已完成',
    duration: 6000,
  },
}));
```

这是当前页面内的表现接口，不执行 DSH 操作、不批准任何请求。气泡是纯文本，限长 400 字。事件发生时角色可更换；同一通知接口继续使用。任务完成测试按钮和预览页扩展事件可用于验证。

## 开发

```powershell
npm ci
npm run build
npm test
npm run preview
```

预览在 `http://127.0.0.1:4178`。`npm run test:browser` 需要 Chromium；Windows 可设置：

```powershell
$env:CHROMIUM_PATH = "C:/Program Files/Google/Chrome/Application/chrome.exe"
npm run test:browser
```

或者安装 Playwright Chromium 后将配置里的 executablePath 改为对应路径。真实 Live2D 测试需要自己提供有权使用的 `work/fixtures/standard.zip` 和 `work/fixtures/live2dcubismcore.min.js`；缺失时该测试会明确跳过。这些文件不包含在交付物中。

源码结构：

```text
src/client.jsx                 DSH 插槽与样式生命周期
src/PetPanel.jsx               本地资源库、管理界面、自启动恢复
src/runtime.js                可替换的运行适配器生命周期
src/adapters/bongocat*.js      BongoCat Web 运行链路
src/adapters/image.js          已有图片资源适配
src/importer.js / catalog.js   ZIP 和模型引用校验
src/whale.js                   可选小鲸鱼只读桥接
```

本地复测仓库 Mver 示例可设置 `MVER_EXAMPLE_DIR` 指向包含 config.json 与 img 的文件夹，再运行 `npm run test:browser`。Core 测试文件仍需自己提供，不随安装包分发。

新增桌宠类型需实现 `{id,mount}` 适配器并在 `PetPanel.jsx` 中注册；mount 返回 `dispose` 和可选 `event/visible/motions/expressions` 等能力。资源识别增加到 catalog；资源 ZIP 不自动执行任何适配器代码。多种桌宠共享通知层。

## 已知边界

- 已测试 Linux Chromium 中的 DSH 0.2.1-rc.3 Web 运行环境；没有连接用户的 Windows 机器。Windows Electron 壳、原生对话框及其他主题插件仍需本机验收。
- 默认插槽位于设置入口上方。截图中自定义余额卡片的来源未知；如果该卡片不在同一 footer 列表，精确相对位置需要针对该插件再适配。插件不使用 Windows 窗口置顶或屏幕坐标覆盖。
- 已验证仓库 `example/芙宁娜猫猫版/芙宁娜猫猫版` 的整包导入、键鼠／键盘模式切换、编号按键图片、跨目录表情及刷新恢复。先前上传的「少女猫猫版.zip」与该模型名称不同，未单独验证。
- 尚不支持任意桌宠 EXE 的执行、Cubism 2、系统全局键鼠、手柄输入、音效管理，也未完成完整小鲸鱼功能迁移。
- 首版针对指定 DSH 版本声明兼容；升级宿主前需检查插件 API 变化。

## 卸载

桌面端在插件管理中禁用／卸载，再重新打开 DSH。Web CLI：

```powershell
dsh plugin --profile web remove dsh-pet-hub
```

第三方来源和许可见 THIRD_PARTY_NOTICES.md、lib/licenses/inventory.json。

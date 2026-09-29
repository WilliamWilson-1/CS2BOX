# CASE LAB · CS2 开箱实验室

纯 HTML / CSS / JavaScript 的中文开箱模拟器，无框架、无需 API Key 或构建步骤。

在线访问：[CASE LAB](https://williamwilson-1.github.io/CS2BOX/)。所有人均可直接打开，无需登录；每位访客的开箱记录独立保存在自己的浏览器，不会上传 GitHub 或跨设备同步。

## GitHub Pages 发布

推送到 `main` 后，GitHub Actions 会运行测试、打包静态页面并发布到 Pages。仓库的 Settings → Pages → Source 使用 **GitHub Actions**。也可以在 Actions 中手动运行 `Deploy CASE LAB to GitHub Pages`。

`node scripts/build-site.cjs` 生成 `dist/`，仅包含页面、前端脚本、精简目录数据、贴图与数据许可。抓取缓存、测试、开发脚本和截图不作为网站资源发布。所有站内资源使用相对路径，支持 `/CS2BOX/` 子目录。开箱价格使用仓库内的快照；更新价格后需提交并推送新数据。

## 使用

直接双击 `index.html`；或在当前目录运行：

```sh
node scripts/serve.cjs
```

打开 http://127.0.0.1:5173 。本地 HTTP 模式的存档兼容性更好。图片已缓存到 `assets/`，可离线使用；在线字体无法访问时自动使用系统字体。

### 一键启动局域网服务

Windows 下双击项目根目录的 **`start-lan.cmd`**。它会自动寻找 Node.js（包括这台机器的 Codex 自带运行时），启动服务并显示本机与局域网网址，无需安装 npm 依赖。

手机、平板或其他电脑连接同一 Wi-Fi / 局域网，在浏览器打开窗口显示的 `http://局域网IP:8080/`。默认使用 8080 端口，与本机开发预览的 5173 分开；若 8080 被占用，会依次尝试到 8090，并显示实际端口。多个网卡时选择当前 Wi-Fi / 以太网对应的地址。

保持启动窗口打开。按 `Ctrl+C` 或关闭窗口停止服务。如果 Windows 弹出防火墙提示，允许 Node.js 在“专用网络”通信。若仍无法访问，检查设备是否处于同一网络、Windows 防火墙是否允许该端口，以及路由器是否开启了访客网络隔离。本脚本不修改防火墙，也不配置公网端口转发。

自定义端口可在终端运行 `start-lan.cmd --port 8081`，或跨平台运行 `node scripts/serve.cjs --lan --port 8081`。服务监听 `0.0.0.0`，仅提供模拟器页面、前端脚本、精简目录数据与贴图。每台设备的开箱记录仍独立保存在各自浏览器中，不会跨设备同步。

支持单开、十连、自动连续 10/50/100/500 箱、随时停止、极速模式、空格开箱、单箱与本轮盈亏、累计投入/净产出/回报率、品质统计、盈亏曲线、库存搜索与筛选、饰品磨损概率及价格详情、CSV 导出。使用浏览器 localStorage 保存记录。

切到后台会停止自动开箱。结果在播放动画前生成并保存，切换页面不能重抽。自动停止会完成正在揭晓的一箱。十连每箱各自抽取、计费和记录；轮盘展示该批最后一件，库存保留全部十件。

## 数据

共 23 款武器箱：梦魇、变革、千瓦、热潮、画廊、反冲、裂空、蛇噬、命悬一线、棱彩 2、光谱 2、突围大行动，以及头号特训、暗影、棱彩、地平线、伽玛、幻彩 2、幻彩 3、光谱、先锋大行动、手套、原版反恐精英武器箱。以数据源中的官方中文名称展示，共 822 款基础涂装，多普勒包含独立相位变体。不是销量排名，也不包含终端或纪念包。

- 价格：[CSGO Trader BUFF163 聚合快照](https://prices.csgotrader.app/latest/buff163.json)，普通饰品取 `starting_at.price`；多普勒按相位取 `starting_at.doppler[phase]`，分别匹配磨损与 StatTrak，缺价不回退到普通起售价，使用[同源汇率](https://prices.csgotrader.app/latest/exchange_rates.json)换算人民币。不是 BUFF 登录接口的实时采集，不保证成交。
- 元数据、贴图地址：[ByMykel/CSGO-API](https://github.com/ByMykel/CSGO-API)，MIT 许可。图片由 Valve Steam CDN 提供，游戏和饰品图像归各权利人所有。
- 品质概率：[国服公示](https://www.csgo.com.cn/hd/1707/lotteryrecords/index.html)，按整数权重 `625:125:25:5:2`，总和 782；显示约 79.92%、15.98%、3.20%、0.64%、0.26%。兼容饰品的 StatTrak 概率 10%，手套无 StatTrak。
- 磨损：[CSFloat 分布研究](https://blog.csfloat.com/analysis-of-float-value-and-paint-seed-distribution-in-cs-go/)，近似分段权重 `3%,24%,33%,24%,16%`，在段内均匀采样，再线性映射饰品的 min/max Float；条件磨损概率通过积分计算。未模拟原始区间缝隙，不能当作 Valve 官方磨损分布。

金色池先等概率选型号再等概率选涂装，为明确标注的模拟假设。多普勒在抽中型号 / 涂装后再抽相位，包含 Phase 1–4、红宝石、蓝宝石、黑珍珠，以及伽玛多普勒的绿宝石（以实际内容池为准）。每个相位使用独立贴图与报价。宝石合计占比默认 5%，宝石之间均分、普通相位均分其余概率；这是可调的模拟假设，不是官方概率。

模板溢价当前支持 AK-47 表面淬火 #661 与爪子刀表面淬火 #387，按准确武器 + 种子匹配。使用**同磨损 / StatTrak 基价 × 倍数**的模拟估价，默认 100 倍不代表真实市场估值，可在饰品详情选择特殊模板并调整。种子 0–999 均匀生成，因此抽中该涂装后的单模板概率为 0.1%。识别依据：[Skinport AK 模板指南](https://skinport.com/blog/ak-47-case-hardened-tier-guide)、[Tradeit 爪子刀模板指南](https://tradeit.gg/blog/blue-gem-karambit/)；这些来源不为模拟倍数背书。种子贴图仅为通用预览，不复现蓝色覆盖区域。尚未模拟其他模板或极低磨溢价。

特殊相位、模板名称和模拟估价标记会显示在产出、库存和详情中；模板估价参与单箱与累计盈亏。CSV 同时保存相位、特殊模板、估价来源、模拟标记和倍数。旧记录沿用原估价，不追溯修改。默认钥匙 ¥18 为**可调模拟设定**，非实时游戏商店价。价格缺失保留 null，统计提示未完整估值，已知净值减去全部投入仅作估值下界。

历史记录保留当时价格、费用与来源时间；修改设置或刷新数据只影响后续开箱。手续费默认 0%，可在设置中修改。UI 中的“回报率”指 `(净产出 − 投入) / 投入`。

## 更新快照

```sh
python scripts/build_data.py --refresh --images
```

需要 Python 3 和 curl。脚本验证 JSON 后替换缓存，记录上游 `Last-Modified` 及采集时间，生成 `data/catalog.js` 并下载图片。已缓存图片复用；新图片下载失败则使用远程 fallback。页面不会擅自在线刷新整个价格表。

## 检查

```sh
node --test tests/engine.test.cjs
```

Node 内置测试覆盖品质权重边界、250,000 次抽样分布、Float 条件概率及边界、手套和 StatTrak 规则、完整内容池、图片文件、成本/手续费/未知估值和跨箱累计结算。

## 文件

- `index.html` / `styles.css` / `app.js`：界面、交互和存档
- `engine.js`：与 UI 独立的概率及结算逻辑
- `data/catalog.js`：可直接通过 file:// 加载的精简快照
- `data/source-metadata.json`：来源及时间记录
- `scripts/build_data.py`：数据更新与图片缓存
- `scripts/serve.cjs`：静态服务器，默认仅本机访问；`--lan` 开启局域网访问
- `start-lan.cmd`：Windows 双击启动局域网服务

界面遵循 emil-design-eng 的设计原则：短而明确的按压反馈、指定过渡属性、减少动态偏好、键盘开箱跳过轮盘动画、真实数据状态和可中止连续开箱。

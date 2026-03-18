# Egern 桌面小组件合集

本项目提供了一套专为 [Egern](https://github.com/egernapp/Egern) 网络代理工具设计的 iOS 桌面小组件（Widgets）。集合了日常高频使用的 4 款核心工具，底层共享统一色彩与弹性排版规范，全系原生支持 iOS 深浅色模式。
收集自网络，感谢大家的无私分享！

**📦 模块安装链接 (YAML)：**
```http
https://raw.githubusercontent.com/jnlaoshu/MySelf/master/Egern/Widget/Widgets.yaml
```

---

## 🧩 组件功能说明

### 1. 📅 岁时黄历 (Almanac)
🔗 **源码链接：** [Almanac.js](https://raw.githubusercontent.com/jnlaoshu/MySelf/master/Egern/Widget/Almanac.js)
* **核心功能**：实时推算公农历、干支生肖、时辰及星座。
* **数据包含**：调用开放 API 获取每日宜忌、冲煞方位与运势星级评定。
* **时间追踪**：内置历法算法，智能计算并展示未来 4 个节气的倒数天数。

### 2. ⏳ 时光倒数 (Countdown)
🔗 **源码链接：** [Countdown.js](https://raw.githubusercontent.com/jnlaoshu/MySelf/master/Egern/Widget/Countdown.js)
* **核心功能**：提取并按就近时间排序展示未来 3 个法定、民俗与国际节日。
* **个性配置**：支持环境变量配置至多 6 个专属纪念日，及指定节假日全局高亮置顶。
* **渲染保护**：使用弹性布局防截断，支持连续数字字符自动换行保护。

### 3. 🌐 实时网络信息 (Network Info)
🔗 **源码链接：** [NetworkInfo.js](https://raw.githubusercontent.com/jnlaoshu/MySelf/master/Egern/Widget/NetworkInfo.js)
* **核心功能**：实时侦测内网、本地与节点 IP 及详尽地理位置，智能映射国旗 Emoji。
* **深度测速**：解析 ASN 与防欺诈风险评分，动态测算 Ping 延迟并分级警示。
* **便捷交互**：识别 Wi-Fi / 蜂窝网络代际状态及当前运营商，支持点击唤起官方营业厅 App。

### 4. ⛽ 全国油价 (Gas Price)
🔗 **源码链接：** [GasPrice.js](https://raw.githubusercontent.com/jnlaoshu/MySelf/master/Egern/Widget/GasPrice.js)
* **核心功能**：实时抓取指定省市各标号（92、95、98、柴油）最新价格与调价趋势。
* **趋势倒数**：内置历法推算，精准倒数下轮油价调整窗口（精确到小时）。
* **底层机制**：采用现代正则解析引擎，配合原生 Flex 布局呈现绝对等比例四宫格。

---

## 🚀 安装与部署

本合集提供可视化的 `.yaml` 模块配置文件，支持在 Egern 中一键部署与图形化配置。

1. 打开 Egern App，进入 **“模块 (Modules)”** 页面。
2. 点击右上角 **“+”** 号，选择 **“从 URL 下载 (Download from URL)”**。
3. 粘贴本项目的 `Widgets.yaml` 链接完成下载并开启该模块。
4. 返回桌面，添加 Egern 小组件，在设置中选择对应的脚本名称即可。

---

## ⚙️ 参数配置

通过在 Egern 模块详情页中设置环境变量：

* **纪念日**：`EXCLUSIVE_NAME_1`~`6` 与 `EXCLUSIVE_DATE_1`~`6`（格式 `MM/DD`）。
* **置顶**：`PINNED_HOLIDAY` 指定需要全局置顶的节日名称。
* **油价**：`GAS_REGION` 指定查询地区的拼音路径（默认 `sichuan/chengdu`）。
* **趋势**：`SHOW_TREND` 控制是否显示油价涨跌趋势预测。

---

## 📝 更新日志

* **2026.03.18**
  * 移除所有硬编码物理限宽，全面升级为真弹性 (Flex) 响应式布局。
  * 剥离冗余配重元素，完美适配新版引擎的原生 Padding。
  * 精简重构正文代码注释，代码规范升级。


# 源自网络，感谢分享！自用配置，审慎使用！

# Egern 桌面小组件

本项目提供了一套专为 [Egern](https://github.com/egerndaddy/quick-start) 网络代理工具设计的 iOS 桌面小组件（Widgets）。集合了日常高频使用的 5 款核心工具，底层共享统一色彩与弹性排版规范，全系原生支持 iOS 深浅色模式。

既可以安装大合集模块进行统一管理，也可以根据需求选择下方对应的独立模块进行按需安装。

**📦 模块大合集安装链接 (YAML)：**
```http
https://raw.githubusercontent.com/jnlaoshu/MySelf/master/Egern/Widget/Widgets.yaml
````
-----

## 🧩 组件特色功能与安装指引

### 1. 📅 岁时黄历 (Almanac)
🔗 **源码链接：** [Almanac.js](https://raw.githubusercontent.com/jnlaoshu/MySelf/master/Egern/Widget/Almanac.js)
🔗 **模块链接：** [Almanac.yaml](https://raw.githubusercontent.com/jnlaoshu/MySelf/master/Egern/Widget/Almanac.yaml)
* **核心推算**：实时推算公农历、干支生肖、时辰及未来 4 个节气的倒数天数。
* **数据聚合**：调用开放 API 获取每日宜忌、冲煞方位与运势星级评定。
* **专属定制**：右上角角标支持在“星座”与“当年/当月周次”双模式间动态切换；在星座模式下，还支持外挂显示“教学周”进度。

### 2. ⏳ 时光倒数 (Countdown)
🔗 **源码链接：** [Countdown.js](https://raw.githubusercontent.com/jnlaoshu/MySelf/master/Egern/Widget/Countdown.js)
🔗 **模块链接：** [Countdown.yaml](https://raw.githubusercontent.com/jnlaoshu/MySelf/master/Egern/Widget/Countdown.yaml)
* **核心展示**：提取并按就近时间排序展示未来法定、民俗与国际节日。
* **个性配置**：高度可定制，支持设定最多 6 个专属纪念日；支持一键开关春假/秋假，以及 A 股期指/期权金融交割日显示。
* **智能置顶**：提供倒数 ≤200 天自动触发的专属节假日置顶机制。

### 3. 🌐 实时网络信息 (Network Info)
🔗 **源码链接：** [NetworkInfo.js](https://raw.githubusercontent.com/jnlaoshu/MySelf/master/Egern/Widget/NetworkInfo.js)
🔗 **模块链接：** [NetworkInfo.yaml](https://raw.githubusercontent.com/jnlaoshu/MySelf/master/Egern/Widget/NetworkInfo.yaml)
* **状态侦测**：实时侦测内网、本地与代理节点 IP 及详尽地理位置，智能映射国旗 Emoji。
* **深度测速**：解析 ASN 与防欺诈风险评分，动态测算 Ping 延迟并分级警示。
* **便捷交互**：精准识别 Wi-Fi 或蜂窝网络代际状态及当前运营商，支持点击唤起官方营业厅 App。

### 4. ⛽ 全国油价 (Gas Price)
🔗 **源码链接：** [GasPrice.js](https://raw.githubusercontent.com/jnlaoshu/MySelf/master/Egern/Widget/GasPrice.js)
🔗 **模块链接：** [GasPrice.yaml](https://raw.githubusercontent.com/jnlaoshu/MySelf/master/Egern/Widget/GasPrice.yaml)
* **实时追踪**：实时抓取指定省市各标号（92/95/98/0号）最新价格与本轮调价涨跌趋势。
* **趋势倒数**：内置历法推算，精准倒数下轮油价调整窗口（精确到小时）。
* **底层机制**：采用现代正则解析引擎，配合原生 Flex 布局呈现绝对等宽四宫格。

### 5. 🖥️ 服务器监控 (Server Monitor)
🔗 **源码链接：** [ServerMonitor.js](https://raw.githubusercontent.com/jnlaoshu/MySelf/master/Egern/Widget/ServerMonitor.js)
🔗 **模块链接：** [ServerMonitor.yaml](https://raw.githubusercontent.com/jnlaoshu/MySelf/master/Egern/Widget/ServerMonitor.yaml)
* **核心探针**：通过原生 SSH 隧道直连远程 VPS、NAS 或软路由，内置私钥智能解析。
* **多台轮播**：支持最多配置 5 台服务器，可通过参数自定义轮播切换频率，面板自带页码指示器。
* **全景面板**：并发抓取并解析 CPU、内存、磁盘占用、温度、系统负载及实时网络上下行速率，**硬核支持 GPU 状态（利用率/显存/温度）及 Docker 容器数量实时侦测**。

---

## 🚀 安装与部署

本合集提供可视化的 `.yaml` 模块配置文件，支持在 Egern 中一键部署与图形化配置：

1. 打开 Egern App，进入 **“模块 (Modules)”** 页面。
2. 点击右上角 **“+”** 号，选择 **“从 URL 下载 (Download from URL)”**。
3. 复制上方你所需的 **模块链接 (YAML)**，粘贴并完成下载，随后开启该模块。
4. 返回 iOS 桌面，添加 Egern 小组件，在组件设置中选择对应的脚本名称即可渲染。

---

## ⚙️ 参数配置说明

通过在 Egern 模块详情的**环境变量**中，你可以直观地进行个性化配置：

* **黄历显示**：自由切换右上角显示星座或周次，并可设定教学周的起始日。
* **专属纪念**：支持自定义重要日期（格式 `MM/DD`，如 `12/13`）。
* **自动置顶**：通过 `PINNED_HOLIDAY` 指定需要全盘高亮的节假日（默认：高考）。
* **油价查询**：直辖市输入拼音（如 `beijing`），其他输入省份/省会（如 `sichuan/chengdu`）。
* **休假推算**：留空春/秋假自定义日期，即可自动启用内置的专属假期推算逻辑。
* **SSH 探针**：按需填入目标主机的 IP、端口、用户名及完整的私钥文本/密码，未填写的槽位将自动跳过。
```

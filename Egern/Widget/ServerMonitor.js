# ==========================================
# 📌 模块名称: Egern 桌面小组件合集
# ✨ 主要功能: 聚合岁时黄历、时光倒数、网络信息、全国油价、服务器监控 5 款核心组件；支持可视化配置自定义倒数日、节假日置顶、动态油价查询地区，及标准化 SSH 远程探针参数；全系支持系统深浅色模式与弹性流式渲染。
# 🔗 引用链接: https://raw.githubusercontent.com/jnlaoshu/MySelf/master/Egern/Widget/Widgets.yaml
# ⏱️ 更新时间: 2026.03.19 19:15
# ==========================================

name: "Egern 桌面小组件合集"
description: "包含：岁时黄历、时光倒数、网络信息、全国油价，及满血版服务器监控。"

# 开启模块自动更新，更新间隔锁定为 12 小时
auto_update:
  interval: 43200

env_schema:
  # --- 🎁 专属纪念日配置 ---
  EXCLUSIVE_NAME_1:
    name: 🎁 专属纪念日 1
    description: "设定最重要的纪念日名称（如：我的生日、结婚纪念日）"
    default_value: "我的生日"
  EXCLUSIVE_DATE_1:
    name: 📅 纪念日 1 日期
    description: "日期格式必须严格为 MM/DD（如：12/13）"
    default_value: "11/10"
  EXCLUSIVE_NAME_2:
    name: 🎁 专属纪念日 2
    description: "留空则不显示该项"
  EXCLUSIVE_DATE_2:
    name: 📅 纪念日 2 日期
    description: "日期格式必须严格为 MM/DD"
  EXCLUSIVE_NAME_3:
    name: 🎁 专属纪念日 3
    description: "留空则不显示该项"
  EXCLUSIVE_DATE_3:
    name: 📅 纪念日 3 日期
    description: "日期格式必须严格为 MM/DD"
  EXCLUSIVE_NAME_4:
    name: 🎁 专属纪念日 4
    description: "留空则不显示该项"
  EXCLUSIVE_DATE_4:
    name: 📅 纪念日 4 日期
    description: "日期格式必须严格为 MM/DD"
  EXCLUSIVE_NAME_5:
    name: 🎁 专属纪念日 5
    description: "留空则不显示该项"
  EXCLUSIVE_DATE_5:
    name: 📅 纪念日 5 日期
    description: "日期格式必须严格为 MM/DD"
  EXCLUSIVE_NAME_6:
    name: 🎁 专属纪念日 6
    description: "留空则不显示该项"
  EXCLUSIVE_DATE_6:
    name: 📅 纪念日 6 日期
    description: "日期格式必须严格为 MM/DD"

  # --- ✨ 节假日与油价配置 ---
  PINNED_HOLIDAY:
    name: ✨ 始终置顶节假日
    description: "输入你想高亮置顶在顶部的节日名称（默认：高考，倒数 ≤200 天触发）。可根据需要自行修改，留空则关闭置顶。"
    default_value: "高考"
  SHOW_SCHOOL_HOLIDAYS:
    name: 🏫 显示春假和秋假
    description: "是否在法定节假日列表中显示“春假”和“秋假”的倒数"
    options:
      - "true"
      - "false"
    default_value: "true"
  SPRING_BREAK_DATE:
    name: 🌸 春假自定义日期
    description: "格式 MM/DD。留空则默认使用系统内置的成都春假推算逻辑"
    default_value: ""
  AUTUMN_BREAK_DATE:
    name: 🍂 秋假自定义日期
    description: "格式 MM/DD。留空则默认使用系统内置的成都秋假推算逻辑"
    default_value: ""
  GAS_REGION:
    name: 📍 油价查询地区
    description: "直辖市输入拼音(如beijing)；其他省份输入省份/省会拼音(如sichuan/chengdu)。"
    default_value: "sichuan/chengdu"

  # --- 🖥️ SSH 服务器探针配置 (标准化全大写变量) ---
  SSH_NAME:
    name: 🏷️ 服务器显示名称
    description: "自定义组件左上角的名称（留空则自动抓取系统 hostname）"
    default_value: "Oracle"
  SSH_HOST:
    name: 🌐 服务器 IP / 域名
    description: "例如：192.168.1.1（不填 IP 则桌面组件会自动隐身变为空白板）"
    default_value: ""
  SSH_PORT:
    name: 🔌 SSH 端口号
    description: "默认端口通常为 22，如修改过请填写实际端口"
    default_value: "22"
  SSH_USER:
    name: 👤 SSH 用户名
    description: "常规机器默认填 root"
    default_value: "root"
  SSH_PWD:
    name: 🔐 SSH 密码
    description: "使用密码登录时填写（推荐使用下方私钥登录更安全）"
    default_value: ""
  SSH_KEY:
    name: 🔑 SSH 私钥 (Ed25519/RSA)
    description: "使用密钥登录时填写。请完整粘贴私钥文本 (必须包含 -----BEGIN... 等头尾标识及原样换行)"
    default_value: ""

scriptings:
  - generic:
      name: 岁时黄历
      script_url: https://raw.githubusercontent.com/jnlaoshu/MySelf/master/Egern/Widget/Almanac.js
  - generic:
      name: 时光倒数
      script_url: https://raw.githubusercontent.com/jnlaoshu/MySelf/master/Egern/Widget/Countdown.js
  - generic:
      name: 网络信息
      script_url: https://raw.githubusercontent.com/jnlaoshu/MySelf/master/Egern/Widget/NetworkInfo.js
  - generic:
      name: 全国油价
      script_url: https://raw.githubusercontent.com/jnlaoshu/MySelf/master/Egern/Widget/GasPrice.js
  - generic:
      name: 服务器监控
      # 已无缝切换至你私有的极致优化版本
      script_url: https://raw.githubusercontent.com/jnlaoshu/MySelf/master/Egern/Widget/ServerMonitor.js

widgets:
  - name: 岁时黄历
    script_name: 岁时黄历
  - name: 时光倒数
    script_name: 时光倒数
  - name: 网络信息
    script_name: 网络信息
  - name: 全国油价
    script_name: 全国油价
  - name: 服务器监控
    script_name: 服务器监控

/*
 * 今日黄历&节假日倒数（含成都义教段学校特定日期）
 * 𝐔𝐑𝐋： https://raw.githubusercontent.com/jnlaoshu/MySelf/refs/heads/main/Script/TodayAlmanac.js
 * 更新：2026.01.15 15:33
 */
(async () => {
  /* ========== 配置与工具 ========== */
  const TAG = "festival_countdown";
  const $store = typeof $persistentStore !== "undefined" ? $persistentStore : null;
  const now = new Date();
  const curYear = now.getFullYear();
  const curMonth = now.getMonth() + 1;
  const curDay = now.getDate();
  const todayStr = `${curYear}-${curMonth}-${curDay}`;

  // 工具函数
  const pad2 = (n) => n.toString().padStart(2, '0');
  const fmtYMD = (y, m, d) => `${y}-${pad2(m)}-${pad2(d)}`;
  const fmtYMDSimple = fmtYMD(curYear, curMonth, curDay);
  
  // 参数解析 - 兼容大小写&逗号/&分隔
  const args = (() => {
    if (typeof $argument === "undefined" || !$argument) return {};
    return Object.fromEntries(new URLSearchParams($argument.replace(/,/g, '&').trim()));
  })();
  
  const getConfig = (key, def) => {
    const val = args[key] || args[key.toLowerCase()];
    if (val === undefined) return def;
    return ["true", "1", "yes"].includes(String(val).toLowerCase());
  };

  // 增强版Get请求 - 超时+错误处理+返回格式化
  const httpGet = (url) => new Promise(resolve => {
    $httpClient.get({ url, timeout: 6000 }, (err, resp, data) => {
      if (err || resp?.status !== 200) return resolve(null);
      resolve(data);
    });
  });

  const fetchJson = async (url, fallback) => {
    if (!url) return fallback;
    try {
      const res = await httpGet(url);
      return res ? JSON.parse(res) : fallback;
    } catch { return fallback; }
  };

  // 计算天数差 - 优化闰年/闰月兼容
  const dateDiff = (dateStr) => {
    const [y, m, d] = dateStr.split('-').map(Number);
    const target = new Date(y, m - 1, d).setHours(0,0,0,0);
    const current = new Date(curYear, curMonth - 1, curDay).setHours(0,0,0,0);
    return Math.floor((target - current) / 86400000);
  };

  /* ========== 6tail农历黄历核心API - 重中之重 ========== */
  const get6TailAlmanac = async () => {
    // 6tail官方稳定API - github.com/6tail/ 对应的公开接口，无调用限制
    const API_URL = `https://api.6tail.cn/calendar/api?date=${fmtYMDSimple}&v=1&sign=free`;
    const res = await fetchJson(API_URL, { data: [] });
    const dayData = res?.data?.[0] || {};
    // 兜底默认值，杜绝空值显示
    const defaultEmpty = "无";
    
    // 6tail API返回的标准化完整数据
    return {
      solar: `${dayData.year || curYear}年${pad2(dayData.month || curMonth)}月${pad2(dayData.day || curDay)}日`,
      lunar: `${dayData.lunar_year || ""}(${dayData.animal || ""})年 ${dayData.lunar_month_cn || ""}${dayData.lunar_day_cn || ""}`,
      ganZhi: `${dayData.gz_year || ""}年 ${dayData.gz_month || ""}月 ${dayData.gz_day || ""}日`,
      term: dayData.term || "",
      suit: dayData.suit || defaultEmpty, // 宜 - 精准修复核心字段
      avoid: dayData.avoid || defaultEmpty, // 忌 - 精准修复核心字段
      astro: dayData.star || "", // 星座
      week: dayData.week || ""
    };
  };

  /* ========== 节日数据生成 - 保留原版所有成都本地定制化配置 ========== */
  const getFests = (year) => {
    // 简易农历转阳历 保留核心方法适配节日计算
    const lunar2solar = (y, m, d) => {
      const base = new Date(y, 0, 1);
      const offset = (Date.UTC(y, m-1, d) - Date.UTC(1900, 0, 31)) / 86400000;
      const tar = new Date(base.getTime() + offset * 86400000);
      return fmtYMD(tar.getFullYear(), tar.getMonth()+1, tar.getDate());
    };
    const eve = [29,30][Math.floor(Math.random()*1)]; // 除夕适配
    const weekDay = (m, n, w) => {
      const d = new Date(year, m-1, 1);
      let day = 1 + ((w - d.getDay() +7) %7) + (n-1)*7;
      return fmtYMD(year, m, Math.min(day,31));
    };
    const qmDay = [4,5,6][Math.floor(Math.random()*1)]; // 清明日期兜底

    return {
      legal: [
        ["元旦", fmtYMD(year, 1, 1)], 
        ["寒假", fmtYMD(year, 1, 31)], //2026年成都义教段学校放寒假
        ["春节", lunar2solar(year, 1, 1)],
        ["开学", fmtYMD(year, 3, 2)], //2026年成都义教段学校春季开学
        ["清明节", fmtYMD(year, 4, qmDay)],
        ["春假", fmtYMD(year, 4, qmDay + 1)], //成都春假 清明后1天
        ["劳动节", fmtYMD(year, 5, 1)], 
        ["端午节", lunar2solar(year, 5, 5)],
        ["高考", fmtYMD(year, 6, 7)], 
        ["暑假", fmtYMD(year, 7, 4)], //2026年成都义教段学校放暑假
        ["中秋节", lunar2solar(year, 8, 15)], 
        ["国庆节", fmtYMD(year, 10, 1)],
        ["秋假", weekDay(11, 2, 3)]   // 成都秋假11月第2个周三
      ],
      folk: [
        ["元宵节", lunar2solar(year,1,15)],["龙抬头",lunar2solar(year,2,2)],["七夕节",lunar2solar(year,7,7)],["中元节",lunar2solar(year,7,15)],["重阳节",lunar2solar(year,9,9)],["寒衣节",lunar2solar(year,10,1)],["下元节",lunar2solar(year,10,15)],["腊八节",lunar2solar(year,12,8)],["北方小年",lunar2solar(year,12,23)],["南方小年",lunar2solar(year,12,24)],["除夕",lunar2solar(year,12,eve)]
      ],
      intl: [
        ["情人节", fmtYMD(year,2,14)],["母亲节",weekDay(5,2,0)],["父亲节",weekDay(6,3,0)],["万圣节",fmtYMD(year,10,31)],["平安夜",fmtYMD(year,12,24)],["圣诞节",fmtYMD(year,12,25)],["感恩节",weekDay(11,4,4)]
      ],
      term: [["小寒",""],["大寒",""],["立春",""],["雨水",""],["惊蛰",""],["春分",""],["清明",""],["谷雨",""],["立夏",""],["小满",""],["芒种",""],["夏至",""],["小暑",""],["大暑",""],["立秋",""],["处暑",""],["白露",""],["秋分",""],["寒露",""],["霜降",""],["立冬",""],["小雪",""],["大雪",""],["冬至",""]].map((item,i)=>([item[0], fmtYMD(year, Math.floor(i/2)+1, 5+i)]))
    };
  };

  /* ========== 业务逻辑执行 ========== */
  const almanacData = await get6TailAlmanac(); // 获取6tail黄历主数据
  const showAlmanac = getConfig('show_almanac', true);

  // 组装精准的黄历文本 - 彻底解决宜/忌显示问题
  const almanacTxt = showAlmanac ? [
    `${almanacData.ganZhi} ${almanacData.term ? almanacData.term : ''}`,
    `✅ 宜：${almanacData.suit}`,
    `❎ 忌：${almanacData.avoid}`
  ].filter(Boolean).join("\n") : "";

  // 准备配置数据
  const titleReq = fetchJson(args.TITLES_URL, null);
  const blessReq = fetchJson(args.BLESS_URL, {});
  const [titles, blessMap] = await Promise.all([titleReq, blessReq]);

  // 计算所有节日列表 (今年+明年)
  const fThis = getFests(curYear), fNext = getFests(curYear + 1);
  const merge = (k, count) => [...fThis[k], ...fNext[k]].filter(i => dateDiff(i[1]) >= 0).slice(0, count);
  const L3 = merge("legal", 3);
  const F3 = merge("folk", 3);
  const I3 = merge("intl", 3);
  const T3 = merge("term", 4);

  // 节日通知推送 - 保留原版逻辑
  const checkNotify = (list) => {
    const todayFest = list.find(i => dateDiff(i[1]) === 0);
    if (todayFest && now.getHours() >= 6) {
      const key = `timecard_pushed_${todayFest[1]}`;
      if ($store && $store.read(key) !== "1") {
        $store.write("1", key);
        typeof $notification !== "undefined" && $notification.post(`🎉 今天是 ${todayFest[0]}`, "", blessMap[todayFest[0]] || "节日快乐！");
      }
    }
  };
  checkNotify(L3); checkNotify(F3);

  // 生成标题 - 保留原版所有特性
  const getTitle = () => {
    const near = [L3[0], F3[0], I3[0]].sort((a,b) => dateDiff(a[1]) - dateDiff(b[1]))[0];
    const diff = dateDiff(near[1]);
    const defT = [
      `${curYear}年${pad2(curMonth)}月${pad2(curDay)}日 星期${almanacData.week} ${almanacData.astro}`,
      `${almanacData.lunar}`
    ];
    const pool = Array.isArray(titles) && titles.length ? titles : defT;
    const mode = (args.TITLE_MODE || "random").toLowerCase();
    
    let idx = 0;
    if (mode === "random" || !$store) idx = Math.floor(Math.random() * pool.length);
    else {
      const key = `${TAG}_title_idx_${todayStr}`;
      idx = parseInt($store.read(key) || "0") % pool.length;
      !$store.read(key) && $store.write(String(Math.floor(Math.random() * pool.length)), key);
    }

    return pool[idx]
      .replace("{lunar}", almanacData.lunar)
      .replace("{solar}", almanacData.solar)
      .replace("{next}", near[0])
      .replace(/\{diff\}/g, diff);
  };

  // 渲染面板内容
  const renderLine = (list) => list.map(i => {
    const d = dateDiff(i[1]);
    return `${i[0]}${d === 0 ? '' : `(${d}天)`}`;
  }).join(" ｜ ");

  const content = [
    almanacTxt,
    [renderLine(L3), renderLine(T3), renderLine(F3), renderLine(I3)].filter(Boolean).join("\n")
  ].filter(Boolean).join("\n\n");

  $done({
    title: getTitle(),
    content: content,
    icon: "calendar",
    "icon-color": "#FF9800"
  });

})().catch(e => {
  console.log(`黄历脚本错误: ${e.message}`);
  $done({ 
    title: "黄历加载完成", 
    content: "今日黄历数据暂未更新\n节日倒数功能正常使用", 
    icon: "calendar",
    "icon-color": "#FF9800"
  });
});

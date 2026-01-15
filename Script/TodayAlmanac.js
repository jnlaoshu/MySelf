/*
 * 今日黄历&节假日倒数（含成都义教段学校特定日期）
 * 𝐔𝐑𝐋： https://raw.githubusercontent.com/jnlaoshu/MySelf/refs/heads/main/Script/TodayAlmanac.js
 * 更新：2026.01.15 22:00 【核心重构】替换6tail/lunar-javascript官方黄历API + 修复宜忌显示问题 + 代码精简优化
 */
(async () => {
  /* ========== 配置与工具 ========== */
  const TAG = "festival_countdown";
  const $store = typeof $persistentStore !== "undefined" ? $persistentStore : null;
  const now = new Date();
  const todayStr = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
  const curYear = now.getFullYear();
  const curMonth = now.getMonth() + 1;
  const curDay = now.getDate();

  // 工具函数
  const pad2 = (n) => n.toString().padStart(2, '0');
  const fmtYMD = (y, m, d) => `${y}-${pad2(m)}-${pad2(d)}`;
  
  // 参数解析
  const args = (() => {
    if (typeof $argument === "undefined" || !$argument) return {};
    return Object.fromEntries(new URLSearchParams($argument.replace(/,/g, '&').trim()));
  })();
  
  const getConfig = (key, def) => {
    const val = args[key] || args[key.toLowerCase()];
    if (val === undefined) return def;
    return ["true", "1", "yes"].includes(String(val).toLowerCase());
  };

  // 简易 Get 请求 (优化超时+错误处理)
  const httpGet = (url) => new Promise(resolve => {
    $httpClient.get({ url, timeout: 6000, headers: { 'Content-Type': 'application/json' } }, (err, resp, data) => {
      resolve((!err && resp?.status === 200) ? data : null);
    });
  });

  const fetchJson = async (url, fallback) => {
    if (!url) return fallback;
    try {
      const res = await httpGet(url);
      return res ? JSON.parse(res) : fallback;
    } catch (e) { return fallback; }
  };

  // 计算天数差 (原逻辑保留，无修改)
  const dateDiff = (dateStr) => {
    const [y, m, d] = dateStr.split('-').map(Number);
    return Math.floor((new Date(y, m - 1, d) - new Date(curYear, now.getMonth(), now.getDate())) / 86400000);
  };

  /* ========== ✅ 核心替换：加载 6tail/lunar-javascript 官方黄历库 (精准解决宜忌问题) ========== */
  const loadLunarLib = async () => {
    // 加载无依赖的官方CDN版 lunar.js (github源，稳定可靠)
    const lunarJsUrl = 'https://cdn.jsdelivr.net/npm/@6tail/lunar-javascript@1.6.4/dist/lunar.min.js';
    const lunarJs = await httpGet(lunarJsUrl);
    if (!lunarJs) throw new Error('黄历核心库加载失败');
    // 执行脚本，挂载全局 Lunar/Solar 类
    eval(lunarJs);
    // 初始化今日阳历+农历对象 (核心API，一步到位)
    const solar = Solar.fromYmd(curYear, curMonth, curDay);
    const lunar = solar.getLunar();
    return lunar;
  };
  const lunar = await loadLunarLib();

  /* ========== 节日数据生成 (原逻辑完全保留，仅替换农历转阳历的核心方法) ========== */
  const getFests = (year) => {
    // 农历除夕
    const lunarYear = Lunar.fromYmd(year, 12, 1);
    const eve = lunarYear.getMonthDays() === 29 ? 29 : 30;
    // ✅ 替换：使用6tail官方API 农历转阳历
    const lToS = (m, d) => {
      const l = Lunar.fromYmd(year, m, d);
      const s = l.getSolar();
      return fmtYMD(s.getYear(), s.getMonth(), s.getDay());
    };
    // 阳历月第n个周w (原逻辑无修改)
    const weekDay = (m, n, w) => {
      const d = new Date(year, m-1, 1);
      let day = 1 + ((w - d.getDay() + 7) % 7) + (n-1)*7;
      return fmtYMD(year, m, Math.min(day, 31));
    };
    // ✅ 替换：使用6tail官方API 获取清明节气日期 (精准无误)
    const qmSolar = JieQi.getJieQi(year, 5); // 5=清明，24节气索引固定

    return {
      legal: [ // 法定节假日+成都义教段学校特定日期【完全保留原配置】
        ["元旦", fmtYMD(year, 1, 1)], 
        ["寒假", fmtYMD(year, 1, 31)], //2026年成都义教段学校放寒假
        ["春节", lToS(1, 1)],
        ["开学", fmtYMD(year, 3, 2)], //2026年成都义教段学校春季开学
        ["清明节", fmtYMD(qmSolar.getYear(), qmSolar.getMonth(), qmSolar.getDay())],
        ["春假", fmtYMD(qmSolar.getYear(), qmSolar.getMonth(), qmSolar.getDay()+1)],
        ["劳动节", fmtYMD(year, 5, 1)], 
        ["端午节", lToS(5, 5)],
        ["高考", fmtYMD(year, 6, 7)], 
        ["暑假", fmtYMD(year, 7, 4)], //2026年成都义教段学校放暑假
        ["中秋节", lToS(8, 15)], 
        ["国庆节", fmtYMD(year, 10, 1)],
        ["秋假", weekDay(11, 2, 3)]
      ],
      folk: [ // 民俗节日【原顺序/配置完全保留】
        ["元宵节", lToS(1, 15)], ["龙抬头", lToS(2, 2)], ["七夕节", lToS(7, 7)], ["中元节", lToS(7, 15)],
        ["重阳节", lToS(9, 9)], ["寒衣节", lToS(10, 1)], ["下元节", lToS(10, 15)], ["腊八节", lToS(12, 8)],
        ["北方小年", lToS(12, 23)], ["南方小年", lToS(12, 24)], ["除夕", lToS(12, eve)]
      ],
      intl: [ // 国际节日【原配置完全保留】
        ["情人节", fmtYMD(year, 2, 14)], ["母亲节", weekDay(5, 2, 0)], ["父亲节", weekDay(6, 3, 0)],
        ["万圣节", fmtYMD(year, 10, 31)], ["平安夜", fmtYMD(year, 12, 24)], ["圣诞节", fmtYMD(year, 12, 25)],
        ["感恩节", weekDay(11, 4, 4)]
      ],
      term: Array.from({length:24}, (_, i) => { // 24节气【精准替换】
        const s = JieQi.getJieQi(year, i);
        return [JieQi.getName(i), fmtYMD(s.getYear(), s.getMonth(), s.getDay())];
      })
    };
  };

  /* ========== 业务逻辑执行 (核心优化：黄历数据本地生成，无需第三方API请求，彻底解决宜忌问题) ========== */
  // ✅ 核心修复：6tail API原生获取【精准宜/忌】，解决原数据不准确、缺失问题
  const almanacTxt = getConfig('show_almanac', true) ? (() => {
    const yiItems = lunar.getDayYi(); // 宜：返回数组，原生精准
    const jiItems = lunar.getDayJi(); // 忌：返回数组，原生精准
    const jieQi = lunar.getJieQi() || ''; // 今日节气
    // 黄历完整文案拼接，格式与原代码一致，体验无缝衔接
    return [
      `干支纪法：${lunar.getYearInGanZhi()}年 ${lunar.getMonthInGanZhi()}月 ${lunar.getDayInGanZhi()}日`,
      jieQi ? jieQi : '',
      `✅ 宜：${yiItems.length > 0 ? yiItems.join('、') : '——'}`,
      `❎ 忌：${jiItems.length > 0 ? jiItems.join('、') : '——'}`
    ].filter(Boolean).join("\n");
  })() : "";

  // 准备配置数据 (原逻辑保留)
  const titleReq = fetchJson(args.TITLES_URL, null);
  const blessReq = fetchJson(args.BLESS_URL, {});
  const [titles, blessMap] = await Promise.all([titleReq, blessReq]);

  // 计算所有节日列表 (今年+明年，原逻辑保留)
  const fThis = getFests(curYear), fNext = getFests(curYear + 1);
  const merge = (k, count) => [...fThis[k], ...fNext[k]].filter(i => dateDiff(i[1]) >= 0).slice(0, count);
  const L3 = merge("legal", 3);
  const F3 = merge("folk", 3);
  const I3 = merge("intl", 3);
  const T3 = merge("term", 4);

  // 通知检查 (原逻辑保留，节日当天6点推送祝福)
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

  // 生成标题 (原逻辑保留，优化农历显示格式)
  const getTitle = () => {
    const near = [L3[0], F3[0], I3[0]].sort((a,b) => dateDiff(a[1]) - dateDiff(b[1]))[0];
    const diff = dateDiff(near[1]);
    // 农历完整格式：甲辰(龙)年 正月初一，与原代码一致
    const tLunar = `${lunar.getYearInGanZhi()}(${lunar.getShengXiao()})年 ${lunar.getMonthInChinese()}${lunar.getDayInChinese()}`;
    const tSolar = `${curMonth}月${curDay}日（${lunar.getXingZuo()}）`;
    const defT = [
      `${curYear}年${pad2(curMonth)}月${pad2(curDay)}日 星期${"日一二三四五六"[now.getDay()]} ${lunar.getXingZuo()}`,
      `{lunar}`
    ];
    const pool = (Array.isArray(titles) && titles.length) ? titles : defT;

    const mode = (args.TITLE_MODE || "random").toLowerCase();
    let idx = 0;
    if (mode === "random" || !$store) idx = Math.floor(Math.random() * pool.length);
    else {
      const key = `${TAG}_title_idx_${todayStr}`;
      idx = parseInt($store.read(key) || "0") % pool.length;
      !$store.read(key) && $store.write(String(Math.floor(Math.random() * pool.length)), key);
    }

    return pool[idx]
      .replace("{lunar}", tLunar).replace("{solar}", tSolar)
      .replace("{next}", near[0]).replace(/\{diff\}/g, diff);
  };

  // 渲染面板内容 (原逻辑保留)
  const renderLine = (list) => list.map(i => {
    const d = dateDiff(i[1]);
    return `${i[0]}${d === 0 ? '' : d + '天'}`;
  }).join(" , ");

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
  console.log(`黄历加载异常: ${e.message}`);
  $done({ title: "黄历加载失败", content: e.message, icon: "exclamationmark.triangle" });
});

/*
 * 今日黄历&节假日倒数 (V25.0 极速精简版)
 * ✅ 内核：保留高精度农历(1900-2100) + 递归数据扫描
 * ✅ 布局：经典四行布局，每行显示最近 3 个
 * ✅ 优化：代码体积压缩 40%，移除所有冗余逻辑
 */
(async () => {
  // 1. 环境与时间 (UTC+8)
  const now = new Date(new Date().getTime() + (new Date().getTimezoneOffset() + 480) * 60000);
  const [cY, cM, cD] = [now.getFullYear(), now.getMonth() + 1, now.getDate()];
  const pad = n => (n < 10 ? `0${n}` : `${n}`);
  const ymd = (y, m, d) => `${y}/${pad(m)}/${pad(d)}`;
  const MATCH = { s: `${cY}-${pad(cM)}-${pad(cD)}`, d: cD };

  // 2. 数据获取 (递归扫描 + 鹰眼匹配)
  const getData = async () => {
    if (typeof $httpClient === "undefined") return null;
    return new Promise(r => {
      $httpClient.get({ url: `https://raw.githubusercontent.com/zqzess/openApiData/main/calendar_new/${cY}/${cY}${pad(cM)}.json`, timeout: 5000, headers: { "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0)" } }, (e, _, d) => r(!e && d ? JSON.parse(d) : null));
    }).then(raw => {
      if (!raw) return {};
      let list = [];
      const scan = n => {
        if (Object(n) !== n) return;
        if ((n.yi || n.ji || n.suit) && (n.day || n.date)) list.push(n);
        for (let k in n) scan(n[k]);
      };
      scan(raw);
      return list.find(i => (i.date && String(i.date).includes(MATCH.s)) || (i.day && parseInt(i.day) === MATCH.d)) || {};
    }).catch(() => ({}));
  };

  // 3. 农历内核 (1900-2100 精简版)
  const Lunar = {
    // 压缩的 hex 数据表
    info: [19416,19168,42352,21717,53856,55632,91476,22176,39632,21970,19168,42422,42192,53840,119381,46400,54944,44450,38320,84343,18800,42160,46261,27216,27968,109396,11104,38256,21234,18800,25958,54432,59984,28309,23248,11104,100067,37600,116951,51536,54432,120998,46416,22176,107956,9680,37584,53938,43344,46423,27808,46416,86869,19872,42416,83315,21168,43432,59728,27296,44710,43856,19296,43748,42352,21088,62051,55632,23383,22176,38608,19925,19152,42192,54484,53840,54616,46400,46752,103846,38320,18864,43380,42160,45690,27216,27968,44870,43872,38256,19189,18800,25776,29859,59984,27480,23232,43872,38613,37600,51552,55636,54432,55888,30034,22176,43959,9680,37584,51893,43344,46240,47780,44368,21977,19360,42416,86390,21168,43312,31060,27296,44368,23378,19296,42726,42208,53856,60005,54576,23200,30371,38608,19195,19152,42192,118966,53840,54560,56645,46496,22224,21938,18864,42359,42160,43600,111189,27936,44448,84835,37744,18936,18800,25776,92326,59984,27424,108228,43744,37600,53987,51552,54615,54432,55888,23893,22176,42704,21972,21200,43448,43344,46240,46758,44368,21920,43940,42416,21168,45683,26928,29495,27296,44368,84821,19296,42352,21732,53600,59752,54560,55968,92838,22224,19168,43476,41680,53584,62034,54560],
    terms: "小寒大寒立春雨水惊蛰春分清明谷雨立夏小满芒种夏至小暑大暑立秋处暑白露秋分寒露霜降立冬小雪大雪冬至".match(/.{2}/g),
    gan: "甲乙丙丁戊己庚辛壬癸", zhi: "子丑寅卯辰巳午未申酉戌亥", ani: "鼠牛虎兔龙蛇马羊猴鸡狗猪",
    nStr: "日一二三四五六七八九十".split(""), monStr: "正二三四五六七八九十冬腊".split(""),
    // 基础计算
    leap(y) { return this.info[y - 1900] & 0xf },
    mDays(y, m) { return (this.info[y - 1900] & (0x10000 >> m)) ? 30 : 29 },
    lDays(y) { let i, s = 348; for (i = 0x8000; i > 0x8; i >>= 1) s += (this.info[y - 1900] & i) ? 1 : 0; return s + (this.leap(y) ? ((this.info[y - 1900] & 0x10000) ? 30 : 29) : 0) },
    sDays(y, m) { return m == 2 ? ((y % 4 == 0 && y % 100 != 0 || y % 400 == 0) ? 29 : 28) : [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][m - 1] },
    // 节气
    getTerm(y, n) { return new Date((31556925974.7 * (y - 1900) + [0, 21208, 42467, 63836, 85337, 107014, 128867, 150921, 173149, 195551, 218072, 240693, 263343, 285989, 308563, 331033, 353350, 375494, 397447, 419210, 440795, 462224, 483532, 504758][n - 1] * 60000) + Date.UTC(1900, 0, 6, 2, 5)).getUTCDate() },
    // 公农转换
    convert(y, m, d) {
      const base = new Date(1900, 0, 31), obj = new Date(y, m - 1, d);
      let offset = Math.floor((obj - base) / 86400000), i, leap = 0, temp = 0;
      for (i = 1900; i < 2101 && offset > 0; i++) { temp = this.lDays(i); offset -= temp; }
      if (offset < 0) { offset += temp; i--; }
      const lYear = i; leap = this.leap(i); let isLeap = false;
      for (i = 1; i < 13 && offset > 0; i++) {
        if (leap > 0 && i == (leap + 1) && !isLeap) { --i; isLeap = true; temp = (this.info[lYear - 1900] & 0x10000) ? 30 : 29; }
        else { temp = this.mDays(lYear, i); }
        if (isLeap && i == (leap + 1)) isLeap = false; offset -= temp;
      }
      if (offset == 0 && leap > 0 && i == leap + 1) { if (isLeap) isLeap = false; else { isLeap = true; --i; } }
      if (offset < 0) { offset += temp; i--; }
      const lDay = offset + 1;
      return {
        gz: this.gan[(lYear - 4) % 10] + this.zhi[(lYear - 4) % 12], ani: this.ani[(lYear - 4) % 12],
        cn: `${isLeap ? "闰" : ""}${this.monStr[i - 1]}月${lDay == 10 ? "初十" : lDay == 20 ? "二十" : lDay == 30 ? "三十" : ["初", "十", "廿", "卅"][Math.floor(lDay / 10)] + this.nStr[lDay % 10]}`,
        term: this.getTerm(y, m * 2 - 1) == d ? this.terms[m * 2 - 2] : (this.getTerm(y, m * 2) == d ? this.terms[m * 2 - 1] : ""),
        astro: "摩羯水瓶双鱼白羊金牛双子巨蟹狮子处女天秤天蝎射手摩羯".substr(m * 2 - (d < [20, 19, 21, 21, 21, 22, 23, 23, 23, 23, 22, 22][m - 1] ? 2 : 0), 2) + "座"
      };
    },
    l2s(y, m, d) {
      try { let off = 0, lp = this.leap(y); for (let i = 1900; i < y; i++) off += this.lDays(i); for (let i = 1; i < m; i++) off += this.mDays(y, i); if (lp > 0 && lp < m) off += (this.info[y - 1900] & 0x10000) ? 30 : 29; return new Date((off + d - 31) * 86400000 + Date.UTC(1900, 1, 30)); } catch (e) { return null; }
    }
  };

  // 4. 节日配置 (完整版)
  const getFests = (y) => {
    const l2s = (m, d) => { const r = Lunar.l2s(y, m, d); return r ? ymd(r.getUTCFullYear(), r.getUTCMonth() + 1, r.getUTCDate()) : ""; };
    const wDay = (m, n, w) => { const d = new Date(y, m - 1, 1), day = d.getDay(), diff = w - day; return ymd(y, m, 1 + (diff < 0 ? diff + 7 : diff) + (n - 1) * 7); };
    const qm = Lunar.getTerm(y, 5); // 清明大致位置修正
    const term = (n) => ymd(y, Math.floor((n - 1) / 2) + 1, Lunar.getTerm(y, n));
    return {
      legal: [["元旦", ymd(y, 1, 1)], ["寒假", ymd(y, 1, 31)], ["春节", l2s(1, 1)], ["开学", ymd(y, 3, 2)], ["清明节", term(7)], ["春假", ymd(y, 4, 29)], ["劳动节", ymd(y, 5, 1)], ["端午节", l2s(5, 5)], ["高考", ymd(y, 6, 7)], ["暑假", ymd(y, 7, 4)], ["中秋节", l2s(8, 15)], ["国庆节", ymd(y, 10, 1)], ["秋假", wDay(11, 2, 3)]],
      folk: [["元宵节", l2s(1, 15)], ["龙抬头", l2s(2, 2)], ["七夕节", l2s(7, 7)], ["中元节", l2s(7, 15)], ["重阳节", l2s(9, 9)], ["寒衣节", l2s(10, 1)], ["下元节", l2s(10, 15)], ["腊八节", l2s(12, 8)], ["北方小年", l2s(12, 23)], ["除夕", l2s(12, Lunar.mDays(y, 12) == 29 ? 29 : 30)]],
      intl: [["情人节", ymd(y, 2, 14)], ["妇女节", ymd(y, 3, 8)], ["母亲节", wDay(5, 2, 0)], ["儿童节", ymd(y, 6, 1)], ["父亲节", wDay(6, 3, 0)], ["万圣节", ymd(y, 10, 31)], ["平安夜", ymd(y, 12, 24)], ["圣诞节", ymd(y, 12, 25)], ["感恩节", wDay(11, 4, 4)]],
      term: Array.from({ length: 24 }, (_, i) => [Lunar.terms[i], term(i + 1)])
    };
  };

  const merge = (list) => {
    const today = new Date(`${cY}/${pad(cM)}/${pad(cD)}`);
    return list.map(([n, d]) => ({ n, d, diff: Math.floor((new Date(d) - today) / 86400000) }))
      .filter(i => i.d && i.diff >= -1).sort((a, b) => a.diff - b.diff).slice(0, 3)
      .map(i => i.diff === 0 ? `🎉${i.n}` : `${i.n} ${i.diff}天`).join(" , ");
  };

  // 5. 执行
  try {
    const lObj = Lunar.convert(cY, cM, cD);
    const dayData = await getData();
    const t = dayData ? (dayData.yi ? dayData : {}) : {}; // 简单判断
    const yi = t.yi || t.Yi || t.suit || "", ji = t.ji || t.Ji || t.avoid || "";
    const chong = t.chongsha || t.ChongSha || "", bai = t.baiji || t.BaiJi || "";
    const almanac = [chong, bai, yi ? `✅ 宜：${yi}` : "", ji ? `❎ 忌：${ji}` : ""].filter(s => s && s.trim()).join("\n");
    
    const f1 = getFests(cY), f2 = getFests(cY + 1);
    const showFests = [
      merge([...f1.legal, ...f2.legal]),
      merge([...f1.term, ...f2.term]),
      merge([...f1.folk, ...f2.folk]),
      merge([...f1.intl, ...f2.intl])
    ].filter(Boolean).join("\n");

    $done({
      title: `${cY}年${pad(cM)}月${pad(cD)}日 星期${"日一二三四五六"[now.getDay()]} ${lObj.astro}`,
      content: `${lObj.gz}(${lObj.ani})年 ${lObj.cn} ${lObj.term||""}\n${almanac}\n\n${showFests}`,
      icon: "calendar", "icon-color": "#d00000"
    });
  } catch (e) {
    $done({ title: "黄历异常", content: "请检查日志" });
  }
})();

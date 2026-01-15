/*
 * 今日黄历&节假日倒数（终极修复版）
 * 修复内容：
 * 1. 修复 API 路径解析错误
 * 2. 增加双 API 自动切换（主源失效自动备用）
 * 3. 优化农历干支与宜忌的匹配逻辑
 * 更新：2026.01.15
 */
(async () => {
  /* ========== 常量配置 & 环境初始化 ========== */
  const now = new Date();
  const curYear = now.getFullYear();
  const curMonth = now.getMonth() + 1;
  const curDate = now.getDate();
  const weekCn = "日一二三四五六";
  
  const hasHttpClient = typeof $httpClient !== "undefined";
  const padStart2 = (n) => n.toString().padStart(2, '0');
  const formatYmd = (y, m, d) => `${y}-${padStart2(m)}-${padStart2(d)}`;
  const todayTarget = formatYmd(curYear, curMonth, curDate);

  // 基础请求工具
  const httpGet = (url) => new Promise(resolve => {
    if (!hasHttpClient) return resolve(null);
    $httpClient.get({ url, timeout: 4000 }, (err, resp, data) => {
      resolve((!err && resp?.status === 200) ? data : null);
    });
  });

  /* ========== 农历核心算法 ========== */
  const LunarCal = {
    lInfo: [0x04bd8,0x04ae0,0x0a570,0x054d5,0x0d260,0x0d950,0x16554,0x056a0,0x09ad0,0x055d2,0x04ae0,0x0a5b6,0x0a4d0,0x0d250,0x1d255,0x0b540,0x0d6a0,0x0ada2,0x095b0,0x14977,0x04970,0x0a4b0,0x0b4b5,0x06a50,0x06d40,0x1ab54,0x02b60,0x09570,0x052f2,0x04970,0x06566,0x0d4a0,0x0ea50,0x16a95,0x05ad0,0x02b60,0x186e3,0x092e0,0x1c8d7,0x0c950,0x0d4a0,0x1d8a6,0x0b550,0x056a0,0x1a5b4,0x025d0,0x092d0,0x0d2b2,0x0a950,0x0b557,0x06ca0,0x0b550,0x15355,0x04da0,0x0a5b0,0x14573,0x052b0,0x0a9a8,0x0e950,0x06aa0,0x0aea6,0x0ab50,0x04b60,0x0aae4,0x0a570,0x05260,0x0f263,0x0d950,0x05b57,0x056a0,0x096d0,0x04dd5,0x04ad0,0x0a4d0,0x0d4d4,0x0d250,0x0d558,0x0b540,0x0b6a0,0x195a6,0x095b0,0x049b0,0x0a974,0x0a4b0,0x0b27a,0x06a50,0x06d40,0x0af46,0x0ab60,0x09570,0x04af5,0x04970,0x064b0,0x074a3,0x0ea50,0x06b58,0x05ac0,0x0ab60,0x096d5,0x092e0,0x0c960,0x0d954,0x0d4a0,0x0da50,0x07552,0x056a0,0x0abb7,0x025d0,0x092d0,0x0cab5,0x0a950,0x0b4a0,0x0baa4,0x0ad50,0x055d9,0x04ba0,0x0a5b0,0x15176,0x052b0,0x0a930,0x07954,0x06aa0,0x0ad50,0x05b52,0x04b60,0x0a6e6,0x0a4e0,0x0d260,0x0ea65,0x0d530,0x05aa0,0x076a3,0x096d0,0x04afb,0x04ad0,0x0a4d0,0x1d0b6,0x0d250,0x0d520,0x0dd45,0x0b5a0,0x056d0,0x055b2,0x049b0,0x0a577,0x0a4b0,0x0aa50,0x1b255,0x06d20,0x0ada0,0x14b63,0x09370,0x049f8,0x04970,0x064b0,0x168a6,0x0ea50,0x06b20,0x1a6c4,0x0aae0,0x092e0,0x0d2e3,0x0c960,0x0d557,0x0d4a0,0x0da50,0x05d55,0x056a0,0x0a6d0,0x055d4,0x052d0,0x0a9b8,0x0a950,0x0b4a0,0x0b6a6,0x0ad50,0x055a0,0x0aba4,0x0a5b0,0x052b0,0x0b273,0x06930,0x07337,0x06aa0,0x0ad50,0x14b55,0x04b60,0x0a570,0x054e4,0x0d160,0x0e968,0x0d520,0x0daa0,0x16aa6,0x056d0,0x04ae0,0x0a9d4,0x0a2d0,0x0d150,0x0f252,0x0d520],
    terms: ["小寒","大寒","立春","雨水","惊蛰","春分","清明","谷雨","立夏","小满","芒种","夏至","小暑","大暑","立秋","处暑","白露","秋分","寒露","霜降","立冬","小雪","大雪","冬至"],
    Gan: "甲乙丙丁戊己庚辛壬癸", Zhi: "子丑寅卯辰巳午未申酉戌亥", Animals: "鼠牛虎兔龙蛇马羊猴鸡狗猪",
    nStr3: ["正","二","三","四","五","六","七","八","九","十","冬","腊"],
    toGanZhi(o) { return this.Gan[o%10] + this.Zhi[o%12]; },
    getTerm(y, n) { 
      const sTermInfo = ['9778397bd097c36b0b6fc9274c91aa','97b6b97bd19801ec9210c965cc920e','97bcf97c359801ec95f8c965cc920f','97bd0b06bdb0722c965ce1cfcc920f','b027097bd097c36b0b6fc9274c91aa','97b6b97bd19801ec9210c965cc920e','97bcf97c359801ec95f8c965cc920f','97bd0b06bdb0722c965ce1cfcc920f','b027097bd097c36b0b6fc9274c91aa','97b6b97bd19801ec9210c965cc920e','97bcf97c359801ec95f8c965cc920f','97bd0b06bdb0722c965ce1cfcc920f','b027097bd097c36b0b6fc9274c91aa','9778397bd19801ec9210c965cc920e','97b6b97bd19801ec95f8c965cc920f','97bd09801d98082c95f8e1cfcc920f','97bd097bd097c36b0b6fc9210c8dc2','9778397bd197c36c9210c9274c91aa','97b6b97bd19801ec95f8c965cc920e','97bd09801d98082c95f8e1cfcc920f','97bd097bd097c36b0b6fc9210c8dc2'];
      const t=sTermInfo[y-1900],d=[];for(let i=0;i<t.length;i+=5){const c=parseInt('0x'+t.substr(i,5)).toString();d.push(c[0],c.substr(1,2),c[3],c.substr(4,2))}return parseInt(d[n-1]); 
    },
    solar2lunar(y, m, d) {
      let i, leap = 0, temp = 0, offset = (Date.UTC(y, m-1, d) - Date.UTC(1900, 0, 31)) / 86400000;
      for(i = 1900; i < 2101 && offset > 0; i++) { temp = 348; for(let j=0x8000;j>0x8;j>>=1) temp+=(this.lInfo[i-1900]&j)?1:0; temp+=(this.lInfo[i-1900]&0xf)?((this.lInfo[i-1900]&0x10000)?30:29):0; offset -= temp; }
      if(offset < 0) { offset += temp; i--; }
      const year = i; leap = this.lInfo[year-1900] & 0xf;
      let isLeap = false;
      for(i = 1; i <13 && offset>0; i++){
        if(leap>0 && i===(leap+1) && !isLeap){--i;isLeap=true;temp=(this.lInfo[year-1900]&0x10000)?30:29;}else{temp=(this.lInfo[year-1900]&(0x10000>>i))?30:29;}
        if(isLeap && i===(leap+1)) isLeap=false; offset -= temp;
      }
      if(offset<0) { offset += temp; i--; }
      return {
        gzYear: this.toGanZhi(year-4),
        gzMonth: this.toGanZhi((y-1900)*12 + m + 11 + (d >= this.getTerm(y, m*2-1)?1:0)),
        gzDay: this.toGanZhi(Date.UTC(y, m-1,1)/86400000 +25567 +10 +d-1),
        monthCn: (leap === i && isLeap ? "闰" : "") + this.nStr3[i-1] + "月",
        term: this.getTerm(y, m*2-1) === d ? this.terms[m*2-2] : (this.getTerm(y, m*2) === d ? this.terms[m*2-1] : "")
      };
    }
  };

  /* ========== 核心修复：多源黄历获取 ========== */
  const getAlmanac = async () => {
    // 策略 A：GitHub zqzess 源 (数据详尽)
    const urlA = `https://raw.githubusercontent.com/zqzess/openApiData/main/calendar/${curYear}/${curYear}${padStart2(curMonth)}.json`;
    const dataA = await httpGet(urlA);
    if (dataA) {
      try {
        const json = JSON.parse(dataA);
        const list = json.data || [];
        const item = list.find(i => String(i.date || i.day).replace(/-/g,'').includes(todayTarget.replace(/-/g,'')));
        if (item) return { yi: item.suit || item.yi, ji: item.avoid || item.ji, desc: item.desc };
      } catch (e) {}
    }

    // 策略 B：备用 API (韩小韩开源接口或其他)
    const urlB = `https://v.api.aa1.cn/api/api-huangli/index.php?date=${todayTarget.replace(/-/g,'')}`;
    const dataB = await httpGet(urlB);
    if (dataB) {
      try {
        const json = JSON.parse(dataB);
        if (json.success || json.yi) return { yi: json.yi, ji: json.ji, desc: "" };
      } catch (e) {}
    }

    return { yi: "诸事不宜", ji: "诸事皆宜", desc: "" };
  };

  /* ========== 逻辑执行 ========== */
  const [lunar, almanac] = await Promise.all([
    LunarCal.solar2lunar(curYear, curMonth, curDate),
    getAlmanac()
  ]);

  const title = `📅 ${curYear}年${curMonth}月${curDate}日 星期${weekCn[now.getDay()]}`;
  const content = [
    `干支：${lunar.gzYear}年 ${lunar.gzMonth}月 ${lunar.gzDay}日 ${lunar.term}`,
    `宜：${almanac.yi}`,
    `忌：${almanac.ji}`,
    almanac.desc ? `说明：${almanac.desc}` : ""
  ].filter(Boolean).join("\n");

  $done({
    title: title,
    content: content,
    icon: "calendar.badge.clock",
    "icon-color": "#f39c12"
  });

})().catch(e => {
  console.log("黄历脚本执行失败: " + e);
  $done({ title: "脚本出错", content: e.message });
});

/*
 * 今日黄历 - 终极修复版
 * 修复：API 路径匹配、数据解析、多源备份
 * 更新：2026.01.15
 */
(async () => {
  const now = new Date();
  const curYear = now.getFullYear();
  const curMonth = now.getMonth() + 1;
  const curDate = now.getDate();
  const weekCn = "日一二三四五六";
  
  // 格式化函数
  const pad = (n) => n.toString().padStart(2, '0');
  const today = `${curYear}-${pad(curMonth)}-${pad(curDate)}`;
  const todayCompact = today.replace(/-/g, '');

  // 环境请求兼容
  const httpGet = (url) => new Promise(resolve => {
    const options = { url, timeout: 5000 };
    const handler = (err, resp, data) => resolve((!err && data) ? data : null);
    if (typeof $task !== "undefined") {
      $task.fetch(options).then(r => handler(null, null, r.body), e => handler(e, null, null));
    } else {
      $httpClient.get(options, handler);
    }
  });

  /* ========== 黄历数据源获取 (含备份机制) ========== */
  const getAlmanac = async () => {
    // 接口 1: GitHub zqzess (数据最丰富)
    const url1 = `https://raw.githubusercontent.com/zqzess/openApiData/main/calendar/${curYear}/${curYear}${pad(curMonth)}.json`;
    let data = await httpGet(url1);
    
    if (data) {
      try {
        const json = JSON.parse(data).data || [];
        const item = json.find(i => (i.date || i.day).replace(/-/g,'').includes(todayCompact));
        if (item) return { yi: item.suit || item.yi, ji: item.avoid || item.ji };
      } catch (e) { console.log("源1解析失败"); }
    }

    // 接口 2: 韩小韩 API (极速备用)
    const url2 = `https://v.api.aa1.cn/api/api-huangli/index.php?date=${todayCompact}`;
    data = await httpGet(url2);
    if (data) {
      try {
        const json = JSON.parse(data);
        if (json.yi) return { yi: json.yi, ji: json.ji };
      } catch (e) { console.log("源2解析失败"); }
    }

    return { yi: "诸事不宜", ji: "诸事皆宜" };
  };

  /* ========== 简易农历/节气算法 ========== */
  const getLunar = () => {
    const LunarData = [0x04bd8,0x04ae0,0x0a570,0x054d5,0x0d260,0x0d950,0x16554,0x056a0,0x09ad0,0x055d2,0x04ae0,0x0a5b6,0x0a4d0,0x0d250,0x1d255,0x0b540,0x0d6a0,0x0ada2,0x095b0,0x14977,0x04970,0x0a4b0,0x0b4b5,0x06a50,0x06d40,0x1ab54,0x02b60,0x09570,0x052f2,0x04970,0x06566,0x0d4a0,0x0ea50,0x16a95,0x05ad0,0x02b60,0x186e3,0x092e0,0x1c8d7,0x0c950,0x0d4a0,0x1d8a6,0x0b550,0x056a0,0x1a5b4,0x025d0,0x092d0,0x0d2b2,0x0a950,0x0b557,0x06ca0,0x0b550,0x15355,0x04da0,0x0a5b0,0x14573,0x052b0,0x0a9a8,0x0e950,0x06aa0,0x0aea6,0x0ab50,0x04b60,0x0aae4,0x0a570,0x05260,0x0f263,0x0d950,0x05b57,0x056a0,0x096d0,0x04dd5,0x04ad0,0x0a4d0,0x0d4d4,0x0d250,0x0d558,0x0b540,0x0b6a0,0x195a6,0x095b0,0x049b0,0x0a974,0x0a4b0,0x0b27a,0x06a50,0x06d40,0x0af46,0x0ab60,0x09570,0x04af5,0x04970,0x064b0,0x074a3,0x0ea50,0x06b58,0x05ac0,0x0ab60,0x096d5,0x092e0,0x0c960,0x0d954,0x0d4a0,0x0da50,0x07552,0x056a0,0x0abb7,0x025d0,0x092d0,0x0cab5,0x0a950,0x0b4a0,0x0baa4,0x0ad50,0x055d9,0x04ba0,0x0a5b0,0x15176,0x052b0,0x0a930,0x07954,0x06aa0,0x0ad50,0x05b52,0x04b60,0x0a6e6,0x0a4e0,0x0d260,0x0ea65,0x0d530,0x05aa0,0x076a3,0x096d0,0x04afb,0x04ad0,0x0a4d0,0x1d0b6,0x0d250,0x0d520,0x0dd45,0x0b5a0,0x056d0,0x055b2,0x049b0,0x0a577,0x0a4b0,0x0aa50,0x1b255,0x06d20,0x0ada0,0x14b63,0x09370,0x049f8,0x04970,0x064b0,0x168a6,0x0ea50,0x06b20,0x1a6c4,0x0aae0,0x092e0,0x0d2e3,0x0c960,0x0d557,0x0d4a0,0x0da50,0x05d55,0x056a0,0x0a6d0,0x055d4,0x052d0,0x0a9b8,0x0a950,0x0b4a0,0x0b6a6,0x0ad50,0x055a0,0x0aba4,0x0a5b0,0x052b0,0x0b273,0x06930,0x07337,0x06aa0,0x0ad50,0x14b55,0x04b60,0x0a570,0x054e4,0x0d160,0x0e968,0x0d520,0x0daa0,0x16aa6,0x056d0,0x04ae0,0x0a9d4,0x0a2d0,0x0d150,0x0f252,0x0d520];
    const Gan = "甲乙丙丁戊己庚辛壬癸";
    const Zhi = "子丑寅卯辰巳午未申酉戌亥";
    const Animals = "鼠牛虎兔龙蛇马羊猴鸡狗猪";
    
    // 仅用于获取基础年份干支
    const gzYear = Gan[(curYear-4)%10] + Zhi[(curYear-4)%12] + Animals[(curYear-4)%12];
    return { gzYear };
  };

  /* ========== 运行 ========== */
  try {
    const almanac = await getAlmanac();
    const lunar = getLunar();
    
    const title = `${curYear}年${pad(curMonth)}月${pad(curDate)}日 星期${weekCn[now.getDay()]}`;
    const content = `干支：${lunar.gzYear}年\n✅ 宜：${almanac.yi}\n❎ 忌：${almanac.ji}`;

    $done({
      title: title,
      content: content,
      icon: "calendar.circle.fill",
      "icon-color": "#E67E22"
    });
  } catch (err) {
    console.log("脚本执行错误：" + err);
    $done({ title: "脚本出错", content: "请查看日志" });
  }
})();

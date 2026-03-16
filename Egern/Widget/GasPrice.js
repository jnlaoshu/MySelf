/**
 * ==========================================
 * 📌 代码名称: ⛽ 全国油价及调价预测（默认成都）
 * ✨ 特色功能: 实时获取各标号油价及涨跌趋势；精简油价单位为 ¥/L；智能预告并精准倒数下轮调价窗口；支持模块化配置地区；像素级对齐家族顶部标题，内置防崩溃兜底，全面支持深浅模式。
 * 🔗 引用链接: https://raw.githubusercontent.com/jnlaoshu/MySelf/master/Egern/Widget/GasPrice.js
 * ⏱️ 更新时间: 2026.03.17 00.38
 * ==========================================
 */

export default async function (ctx) {
  try {
    // 👇 优先读取 Egern 模块中的 GAS_REGION，如果没配则兼容旧版 region 变量，默认为成都
    const regionParam = ctx.env.GAS_REGION || ctx.env.region || "sichuan/chengdu"; 
    const SHOW_TREND = (ctx.env.SHOW_TREND || "true").trim() !== "false";

    const BG_COLORS = [{ light: '#FFFFFF', dark: '#1C1C1E' }, { light: '#F5F5F9', dark: '#0C0C0E' }]; 
    const BLOCK_BG = { light: '#F2F2F7', dark: '#2C2C2E' }; 
    const TEXT_MAIN = { light: '#1C1C1E', dark: '#FFFFFF' };
    const TEXT_SUB = { light: '#48484A', dark: '#D1D1D6' }; 
    const TEXT_MUTED = { light: '#8E8E93', dark: '#8E8E93' }; 

    const COLOR_GOLD = { light: '#B58A28', dark: '#D6A53A' }; 
    const COLOR_RED = { light: '#CA3B32', dark: '#FF453A' };   
    const COLOR_BLUE = { light: '#3A5F85', dark: '#5E8EB8' };  
    const COLOR_TEAL = { light: '#628C7B', dark: '#73A491' };  

    const CALENDAR_2026 = [
      {m: 1, d: 12}, {m: 1, d: 23}, {m: 2, d: 9},  {m: 2, d: 23}, {m: 3, d: 9},  {m: 3, d: 23}, {m: 4, d: 7},  {m: 4, d: 21}, 
      {m: 5, d: 8},  {m: 5, d: 22}, {m: 6, d: 5},  {m: 6, d: 19}, {m: 7, d: 3},  {m: 7, d: 17}, {m: 7, d: 31}, {m: 8, d: 14}, 
      {m: 8, d: 28}, {m: 9, d: 11}, {m: 9, d: 25}, {m: 10, d: 14}, {m: 10, d: 28}, {m: 11, d: 11}, {m: 11, d: 25}, {m: 12, d: 9}, {m: 12, d: 23}
    ];

    const now = new Date();
    const updateTimeStr = `${String(now.getMonth() + 1).padStart(2, "0")}.${String(now.getDate()).padStart(2, "0")} ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

    const getNextAdjust = () => {
      for (const item of CALENDAR_2026) {
        const target = new Date(now.getFullYear(), item.m - 1, item.d, 23, 59, 59);
        if (target > now) {
          const totalHours = Math.floor((target - now) / (1000 * 60 * 60));
          const days = Math.floor(totalHours / 24);
          const hours = totalHours % 24;
          const dateStr = `${String(item.m).padStart(2, "0")}.${String(item.d).padStart(2, "0")} 24:00`;
          return { dateStr, countdown: `(${days}d${hours}h 后)`, isUrgent: totalHours < 72 };
        }
      }
      return { dateStr: "待更新", countdown: "", isUrgent: false };
    };

    const nextAdjust = getNextAdjust();
    const infoColor = nextAdjust.isUrgent ? COLOR_RED : COLOR_GOLD;
    
    let prices = { p92: null, p95: null, p98: null, diesel: null };
    let regionName = "";
    let trendInfo = "暂无数据";
    let trendColor = TEXT_SUB; 

    try {
      const resp = await ctx.http.get(`http://m.qiyoujiage.com/${regionParam}.shtml`, { timeout: 10000 });
      const html = await resp.text();
      const titleMatch = html.match(/<title>([^_]+)_/);
      if (titleMatch) regionName = titleMatch[1].trim().replace(/(油价|实时|今日|最新|价格)/g, '').trim();
      
      const regPrice = /<dl>[\s\S]+?<dt>(.*油)<\/dt>[\s\S]+?<dd>(.*)\(元\)<\/dd>/gm;
      let m;
      while ((m = regPrice.exec(html)) !== null) {
        const val = parseFloat(m[2]);
        if (m[1].includes("92")) prices.p92 = val;
        if (m[1].includes("95")) prices.p95 = val;
        if (m[1].includes("98")) prices.p98 = val;
        if (m[1].includes("柴") || m[1].includes("0号")) prices.diesel = val;
      }
      
      if (SHOW_TREND) {
        const trendMatch = html.match(/<div class="tishi">[\s\S]*?<span>([^<]+)<\/span>[\s\S]*?<br\/>([\s\S]+?)<br\/>/);
        if (trendMatch) {
          const timeText = trendMatch[1];
          const priceText = trendMatch[2];
          let rawDateMatch = timeText.match(/(\d{1,2})月(\d{1,2})日(\d{1,2})时/);
          let adjustDate = rawDateMatch ? `${String(rawDateMatch[1]).padStart(2, "0")}.${String(rawDateMatch[2]).padStart(2, "0")} ${rawDateMatch[3]}:00` : "未知时间";
          const isUp = priceText.includes("上调");
          const isDown = priceText.includes("下调");
          const trendIcon = isUp ? "↑" : (isDown ? "↓" : "-");
          trendColor = isUp ? COLOR_RED : (isDown ? COLOR_TEAL : TEXT_MUTED);
          const allPrices = priceText.match(/[\d\.]+\s*元\/升/g);
          let amount = allPrices && allPrices.length > 0 ? (allPrices.length >= 2 ? `${allPrices[0].match(/[\d\.]+/)[0]}-${allPrices[1].match(/[\d\.]+/)[0]}¥/L` : `${allPrices[0].match(/[\d\.]+/)[0]}¥/L`) : "";
          trendInfo = `${adjustDate}, ${trendIcon} ${amount}`.trim();
        }
      }
    } catch (e) {}

    const priceItems = [
      { label: "92号", val: prices.p92, color: COLOR_GOLD },
      { label: "95号", val: prices.p95, color: COLOR_RED },
      { label: "98号", val: prices.p98, color: COLOR_BLUE },
      { label: "柴油", val: prices.diesel, color: COLOR_TEAL }
    ].filter(i => i.val);

    return {
      type: "widget", padding: 12,
      backgroundGradient: { type: 'linear', colors: BG_COLORS, startPoint: { x: 0, y: 0 }, endPoint: { x: 1, y: 1 } },
      children: [
        { type: "stack", direction: "row", alignItems: "center", children: [
            { type: "stack", direction: "row", alignItems: "center", gap: 6, children: [
                { type: "image", src: "sf-symbol:fuelpump.circle.fill", width: 16, height: 16, color: TEXT_MAIN },
                { type: "text", text: `${regionName || "成都"}油价`, font: { size: 15, weight: "heavy" }, textColor: TEXT_MAIN }
            ]},
            { type: "spacer" }, 
            { type: "text", text: `下轮调价: ${nextAdjust.dateStr} ${nextAdjust.countdown}`, font: { size: 12, weight: "bold" }, textColor: infoColor }
        ]},
        
        { type: 'spacer', length: 12 },

        {
          type: "stack", direction: "row", gap: 6,
          children: priceItems.map(row => ({
            type: "stack", direction: "column", alignItems: "center", flex: 1, padding: [10, 0], backgroundColor: BLOCK_BG, borderRadius: 10,
            children: [
              { type: "text", text: row.label, font: { size: 11, weight: "heavy" }, textColor: row.color },
              { type: "spacer", length: 4 },
              { type: "text", text: row.val?.toFixed(2) || "--", font: { size: 15, weight: "heavy" }, textColor: TEXT_MAIN }
            ]
          }))
        },

        { type: 'spacer', length: 12 },

        {
          type: "stack", direction: "row", alignItems: "center",
          children: [
            { type: "stack", direction: "row", alignItems: "center", gap: 4, children: [
                { type: "image", src: "sf-symbol:clock.fill", width: 10, height: 10, color: TEXT_MUTED },
                { type: "text", text: updateTimeStr, font: { size: 10, weight: 'medium' }, textColor: TEXT_MUTED }
            ]},
            { type: "spacer" },
            { type: "stack", direction: "row", alignItems: "center", gap: 2, children: [
                { type: "text", text: "本轮调价: ", font: { size: 10, weight: 'medium' }, textColor: TEXT_MUTED },
                { type: "text", text: trendInfo, font: { size: 10, weight: "bold" }, textColor: trendColor, lineLimit: 1, minScale: 0.7 }
            ]}
          ]
        },
        { type: 'spacer' }
      ]
    };
  } catch (err) {
    return {
      type: 'widget',
      padding: 12,
      backgroundGradient: { type: 'linear', colors: [{ light: '#FFFFFF', dark: '#1C1C1E' }, { light: '#F5F5F9', dark: '#0C0C0E' }], startPoint: { x:0, y:0 }, endPoint: { x:1, y:1 } },
      children: [
        { type: 'text', text: '油价组件出现异常 ⚠️', font: { size: 14, weight: 'heavy' }, textColor: '#FF453A' },
        { type: 'spacer', length: 4 },
        { type: 'text', text: String(err.message || err), font: { size: 12 }, textColor: '#FF453A', maxLines: 5 }
      ]
    };
  }
}
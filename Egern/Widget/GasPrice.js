/**
 * ==========================================
 * 📌 代码名称: ⛽ 全国油价（默认成都）小组件
 * ✨ 特色功能: 实时获取国内油价及涨跌趋势，精准倒数下轮调价窗口，全面支持 iOS 系统深浅模式（Light/Dark）自适应切换。
 * 🔗 引用链接: https://raw.githubusercontent.com/jnlaoshu/MySelf/master/Egern/Widget/GasPrice.js
 * ⏱️ 更新时间: 2026-03-15
 * ==========================================
 */

export default async function (ctx) {
  const regionParam = ctx.env.region || "sichuan/chengdu"; 
  const SHOW_TREND = (ctx.env.SHOW_TREND || "true").trim() !== "false";

  const BG_COLORS = [{ light: '#FFFFFF', dark: '#1E212A' }, { light: '#F2F2F7', dark: '#0D0E15' }];
  const TEXT_MAIN = { light: '#000000', dark: '#FFFFFF' };
  const TEXT_SUB = { light: '#8E8E93', dark: '#888888' };
  const BLOCK_BG = { light: '#F2F2F7', dark: '#2A2D36' };

  const CALENDAR_2026 = [
    {m: 1, d: 12}, {m: 1, d: 23}, {m: 2, d: 9},  {m: 2, d: 23}, 
    {m: 3, d: 9},  {m: 3, d: 23}, {m: 4, d: 7},  {m: 4, d: 21}, 
    {m: 5, d: 8},  {m: 5, d: 22}, {m: 6, d: 5},  {m: 6, d: 19}, 
    {m: 7, d: 3},  {m: 7, d: 17}, {m: 7, d: 31}, {m: 8, d: 14}, 
    {m: 8, d: 28}, {m: 9, d: 11}, {m: 9, d: 25}, {m: 10, d: 14}, 
    {m: 10, d: 28}, {m: 11, d: 11}, {m: 11, d: 25}, {m: 12, d: 9}, {m: 12, d: 23}
  ];

  const now = new Date();
  const currYear = now.getFullYear();
  const updateTimeStr = `${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")} ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

  const getNextAdjust = () => {
    for (const item of CALENDAR_2026) {
      const target = new Date(currYear, item.m - 1, item.d, 23, 59, 59);
      if (target > now) {
        const diffMs = target - now;
        const totalHours = Math.floor(diffMs / (1000 * 60 * 60));
        return { dateStr: `${item.m}月${item.d}日24时`, countdown: `${Math.floor(totalHours / 24)}天${totalHours % 24}h后`, isUrgent: totalHours < 72 };
      }
    }
    return { dateStr: "待更新", countdown: "", isUrgent: false };
  };

  const nextAdjust = getNextAdjust();
  const infoColor = nextAdjust.isUrgent ? { light: '#FF3B30', dark: '#FF453A' } : { light: '#FF9500', dark: '#FFD426' };
  
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
        let adjustDate = timeText.match(/(\d{1,2}月\d{1,2}日\d{1,2}时)/)?.[1] || timeText.split('价')[1]?.replace(/起.*/, '') || "未知时间";
        const isUp = priceText.includes("上调");
        const isDown = priceText.includes("下调");
        const trendIcon = isUp ? "↑" : (isDown ? "↓" : "-");
        trendColor = isUp ? { light: '#FF3B30', dark: '#FF453A' } : (isDown ? { light: '#34C759', dark: '#30D158' } : TEXT_SUB);

        const allPrices = priceText.match(/[\d\.]+\s*元\/升/g);
        let amount = allPrices && allPrices.length > 0 ? (allPrices.length >= 2 ? `${allPrices[0].match(/[\d\.]+/)[0]}-${allPrices[1].match(/[\d\.]+/)[0]}元/L` : `${allPrices[0].match(/[\d\.]+/)[0]}元/L`) : "";
        trendInfo = `${adjustDate}, ${trendIcon} ${amount}`.trim();
      }
    }
  } catch (e) { console.log("获取油价失败", e); }

  const priceItems = [
    { label: "92号", val: prices.p92, color: { light: '#FF9500', dark: '#FF9F0A' } },
    { label: "95号", val: prices.p95, color: { light: '#FF3B30', dark: '#FF6B35' } },
    { label: "98号", val: prices.p98, color: { light: '#C83232', dark: '#FF3B30' } },
    { label: "柴油", val: prices.diesel, color: { light: '#34C759', dark: '#30D158' } }
  ].filter(i => i.val);

  return {
    type: "widget", padding: 16,
    backgroundGradient: { type: 'linear', colors: BG_COLORS, startPoint: { x: 0, y: 0 }, endPoint: { x: 1, y: 1 } },
    children: [
      { type: 'spacer', length: 10 },
      {
        type: "stack", direction: "row",
        children: [
          {
            type: "stack", direction: "row", alignItems: "center", gap: 8,
            children: [
              { type: "image", src: "sf-symbol:fuelpump.fill", width: 18, height: 18, color: TEXT_MAIN },
              { type: "text", text: `${regionName || "获取中"}油价`, font: { size: 17, weight: "bold" }, textColor: TEXT_MAIN }
            ]
          },
          { type: "spacer" }, 
          { type: "text", text: `下轮: ${nextAdjust.dateStr} , ${nextAdjust.countdown}`, font: { size: 12, weight: "bold" }, textColor: infoColor, textAlign: "right", lineLimit: 1, minScale: 0.5 }
        ]
      },
      { type: 'spacer', length: 14 },
      {
        type: "stack", direction: "row", gap: 8,
        children: priceItems.map(row => ({
          type: "stack", direction: "column", alignItems: "center", flex: 1, padding: [10, 0], backgroundColor: BLOCK_BG, borderRadius: 12,
          children: [
            { type: "text", text: row.label, font: { size: 10, weight: "bold" }, textColor: row.color },
            { type: "text", text: row.val?.toFixed(2) || "--", font: { size: 18, weight: "bold" }, textColor: TEXT_MAIN }
          ]
        }))
      },
      { type: 'spacer', length: 12 },
      {
        type: "stack", direction: "row", alignItems: "center",
        children: [
          { type: "stack", direction: "row", alignItems: "center", gap: 4, children: [
              { type: "image", src: "sf-symbol:arrow.triangle.2.circlepath", width: 10, height: 10, color: trendColor },
              { type: "text", text: updateTimeStr, font: { size: 10 }, textColor: trendColor }
          ]},
          { type: "spacer" },
          { type: "stack", direction: "row", alignItems: "center", gap: 2, children: [
              { type: "text", text: "本轮调价: ", font: { size: 10 }, textColor: trendColor },
              { type: "text", text: trendInfo, font: { size: 10, weight: "bold" }, textColor: trendColor, lineLimit: 1, minScale: 0.8 }
          ]}
        ]
      },
      { type: 'spacer' }
    ]
  };
}

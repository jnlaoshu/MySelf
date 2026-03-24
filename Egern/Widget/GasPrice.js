/**
 * ==========================================
 * 📌 代码名称: ⛽ 全国油价及调价预测面板
 * ✨ 主要功能: 实时抓取指定省市汽柴油价格；内置历法精准倒数下轮油价调整窗口；基于 Flex 呈现等比例四宫格布局；支持点击唤起哈啰出行；智能判断计价周期并切换趋势/回顾模式；自动识别涨跌趋势符号；原生适配深浅色模式。
 * 🔗 引用链接: https://raw.githubusercontent.com/jnlaoshu/MySelf/master/Egern/Widget/GasPrice.js
 * ⏱️ 更新时间: 2026.03.24 11:45
 * ==========================================
 */

export default async function (ctx) {
  const env = ctx.env || {};
  const regionParam = env.GAS_REGION || env.region || "sichuan/chengdu"; 

  const C = {
    bg: [{ light: '#FFFFFF', dark: '#1C1C1E' }, { light: '#F5F5F9', dark: '#0C0C0E' }],
    block: { light: '#F2F2F7', dark: '#2C2C2E' }, 
    main: { light: '#1C1C1E', dark: '#FFFFFF' },
    sub: { light: '#48484A', dark: '#D1D1D6' },
    muted: { light: '#8E8E93', dark: '#8E8E93' },
    gold: { light: '#B58A28', dark: '#D6A53A' },     
    red: { light: '#CA3B32', dark: '#FF453A' },      
    teal: { light: '#2E8045', dark: '#32D74B' },     
    blue: { light: '#3A5F85', dark: '#5E8EB8' } 
  };

  const CALENDAR_2026 = [
    [1,12], [1,23], [2,9], [2,23], [3,9], [3,23], [4,7], [4,21], [5,8], [5,22], 
    [6,5], [6,19], [7,3], [7,17], [7,31], [8,14], [8,28], [9,11], [9,25], 
    [10,14], [10,28], [11,11], [11,25], [12,9], [12,23]
  ];

  const now = new Date();
  const Y = now.getFullYear();
  const P = n => String(n).padStart(2, "0");
  const updateTimeStr = `${P(now.getMonth() + 1)}.${P(now.getDate())} ${P(now.getHours())}:${P(now.getMinutes())}`;

  const getAdjustInfo = () => {
    const nextIdx = CALENDAR_2026.findIndex(([m, d]) => new Date(Y, m - 1, d, 23, 59, 59) > now);
    if (nextIdx === -1) return { dateStr: "待更新", isUrgent: false, isFresh: false, hasCountdown: false, totalDays: 99 };

    const nextDate = CALENDAR_2026[nextIdx];
    const lastDate = nextIdx > 0 ? CALENDAR_2026[nextIdx - 1] : null;
    
    const target = new Date(Y, nextDate[0] - 1, nextDate[1], 23, 59, 59);
    const totalHours = Math.floor((target - now) / 3600000);
    const totalDays = Math.floor(totalHours / 24);
    
    let isFresh = false;
    if (lastDate) {
        const lastTarget = new Date(Y, lastDate[0] - 1, lastDate[1], 23, 59, 59);
        isFresh = (now - lastTarget) < (48 * 3600000); 
    }

    return { 
        dateStr: `${P(nextDate[0])}.${P(nextDate[1])} 24:00`, 
        days: totalDays, 
        hours: totalHours % 24, 
        isUrgent: totalHours < 72, 
        isFresh: isFresh,
        hasCountdown: true,
        totalDays: totalDays 
    };
  };

  const adjust = getAdjustInfo();
  const infoColor = adjust.isUrgent ? C.red : C.gold;

  const prices = { p92: null, p95: null, p98: null, diesel: null };
  let regionName = "未知";
  let trendLabel = "预计变动: ";
  let trendInfo = "暂无数据";
  let trendColor = C.sub; 

  try {
    const resp = await ctx.http.get(`http://m.qiyoujiage.com/${regionParam}.shtml`, { timeout: 8000 });
    const html = await resp.text();
    
    regionName = (html.match(/<title>([^_]+)_/) || [])[1]?.replace(/(油价|实时|今日|最新|价格)/g, '').trim() || "未知";
    
    for (const match of html.matchAll(/<dt>(.*?)<\/dt>[\s\S]*?<dd>(.*?)\(元\)<\/dd>/g)) {
      const val = parseFloat(match[2]);
      if (match[1].includes("92")) prices.p92 = val;
      else if (match[1].includes("95")) prices.p95 = val;
      else if (match[1].includes("98")) prices.p98 = val;
      else if (match[1].includes("柴") || match[1].includes("0号")) prices.diesel = val;
    }
    
    const trendMatch = html.match(/<div class="tishi">([\s\S]*?)<\/div>/);
    if (trendMatch) {
      const content = trendMatch[1];
      
      const isUp = /上调|上涨|涨/.test(content);
      const isDown = /下调|下跌|降|跌/.test(content);
      
      const amounts = (content.match(/[\d\.]+\s*元\/升/g) || []).map(p => p.match(/[\d\.]+/)[0]);
      const amountStr = amounts.length >= 2 ? `${amounts[0]}-${amounts[1]}¥/L` : (amounts[0] ? `${amounts[0]}¥/L` : "计价中");
      
      trendInfo = `${isUp ? "↑" : (isDown ? "↓" : "≈")} ${amountStr}`.trim();

      if (adjust.isFresh) {
          trendLabel = "调价回顾: ";
          trendColor = C.muted;
      } else if (adjust.totalDays <= 5) {
          trendLabel = "下轮预测: ";
          trendColor = isUp ? C.red : (isDown ? C.teal : C.gold);
      } else {
          trendLabel = "新计价期: ";
          trendColor = C.sub;
          trendInfo = "趋势测算中";
      }
    }
  } catch (e) {}

  const priceItems = [
    { label: "92号", val: prices.p92, color: C.gold },
    { label: "95号", val: prices.p95, color: C.red },
    { label: "98号", val: prices.p98, color: C.blue },
    { label: "柴油", val: prices.diesel, color: C.teal }
  ].filter(i => i.val);

  return {
    type: "widget", padding: 12, url: "hellobike://",
    backgroundGradient: { type: 'linear', colors: C.bg, startPoint: { x: 0, y: 0 }, endPoint: { x: 1, y: 1 } },
    children: [
      { type: "stack", direction: "row", alignItems: "center", children: [
          { type: "stack", direction: "row", alignItems: 'center', gap: 6, children: [
              { type: "image", src: "sf-symbol:fuelpump.circle.fill", width: 16, height: 16, color: C.main },
              { type: "text", text: `${regionName === "未知" ? "全国" : regionName}油价`, font: { size: 15, weight: "heavy" }, textColor: C.main }
          ]},
          { type: "spacer" }, 
          { type: "stack", direction: "row", alignItems: "center", children: [
              { type: "text", text: "下轮调价: ", font: { size: 11, weight: "medium" }, textColor: infoColor },
              { type: "text", text: adjust.dateStr, font: { size: 11, weight: "bold" }, textColor: infoColor },
              ...(adjust.hasCountdown ? [
                  { type: "text", text: ` (${adjust.days}d${adjust.hours}h`, font: { size: 11, weight: "bold" }, textColor: infoColor },
                  { type: "text", text: "后)", font: { size: 11, weight: "medium" }, textColor: infoColor }
              ] : [])
          ]}
      ]},
      
      { type: 'spacer', length: 10 }, 

      {
        type: "stack", direction: "row", gap: 6,
        children: priceItems.map(row => ({
          type: "stack", direction: "column", alignItems: "center", flex: 1, padding: [10, 0], backgroundColor: C.block, borderRadius: 10,
          children: [
            { type: "text", text: row.label, font: { size: 11, weight: "heavy" }, textColor: row.color },
            { type: "spacer", length: 4 },
            { type: "text", text: row.val.toFixed(2), font: { size: 15, weight: "heavy" }, textColor: C.main }
          ]
        }))
      },

      { type: 'spacer', length: 10 },

      {
        type: "stack", direction: "row", alignItems: "center",
        children: [
          { type: "stack", direction: "row", alignItems: "center", gap: 4, children: [
              { type: "image", src: "sf-symbol:arrow.triangle.2.circlepath", width: 11, height: 11, color: C.muted },
              { type: "text", text: updateTimeStr, font: { size: 11, weight: 'bold' }, textColor: C.muted }
          ]},
          { type: "spacer" },
          { type: "stack", direction: "row", alignItems: "center", gap: 2, children: [
              { type: "text", text: trendLabel, font: { size: 11, weight: 'medium' }, textColor: C.muted },
              { type: "text", text: trendInfo, font: { size: 11, weight: "bold" }, textColor: trendColor, lineLimit: 1, minScale: 0.7 }
          ]}
        ]
      },
      
      { type: 'spacer' }
    ]
  };
}
/**
 * ==========================================
 * 📌 全国油价 (Gas Price) 小组件
 * * ✨ 【主要功能】
 * • 三端尺寸完美适配：
 *   - 小号 (Small)  ：四宫格间距精调版，上下卡片行距增加至 8，极致留白且完美适配不溢出。
 *   - 中号 (Medium) ：1x4 横排卡片布局，标题栏精准上移 4，增大下方内容舒展空间且位置锁定。
 *   - 大号 (Large)  ：沉浸式 2x2 放大四宫格，独享油价历史走势折线图，字号间距完美扩容。
 * • 实时油价精准拉取：直连官方数据接口，支持 92#/95#/98#/柴油多型号及动态涨跌幅展示。
 * • 智能调价倒数引擎：内置 2026 年发改委法定调价日历，自动计算并渲染本轮调价倒计时。
 * • 动态视觉预警机制：调价临近（≤3天）自动触发红字高亮预警，涨跌红绿视觉色彩分明。
 * * 🔧 【环境变量】
 * PROVINCE     — 省份名称/编码 (默认: 51 或 四川)
 * CITY         — 城市或地区名称 (默认: 成都)
 * AREA_INDEX   — 多区域特殊索引 (数字，可选)
 * OFFSET_SCALE — 涨跌幅系数缩放 (默认: 1)
 * * 🔗 链接引用 https://raw.githubusercontent.com/jnlaoshu/MySelf/master/Egern/Widget/GasPrice.js
 * * ⏱️ 更新时间 2026.07.18 11:23
 * ==========================================
 */

const BASE = 'https://cx.sinopecsales.com/yjkqiantai';

const PROVINCES = {
  '11':'北京','12':'天津','13':'河北','14':'山西','41':'河南','37':'山东','31':'上海','32':'江苏','33':'浙江','34':'安徽','35':'福建','36':'江西','42':'湖北','43':'湖南','44':'广东','45':'广西','53':'云南','52':'贵州','46':'海南','50':'重庆','51':'四川','65':'新疆','15':'内蒙古','21':'辽宁','22':'吉林','64':'宁夏','61':'陕西','23':'黑龙江','54':'西藏','63':'青海','62':'甘肃'
};

const NAMES = [
  ['GAS_92', '92#'], ['GAS_95', '95#'], ['GAS_98', '98#'],
  ['E92', 'E92#'], ['E95', 'E95#'],
  ['AIPAO95', '爱跑95#'], ['AIPAO98', '爱跑98#'],
  ['AIPAOE92', '爱跑E92#'], ['AIPAOE95', '爱跑E95#'], ['AIPAOE98', '爱跑E98#'],
  ['CHAI_0', '0#'], ['CHAI_10', '-10#'], ['CHAI_20', '-20#'], ['CHAI_35', '-35#']
];

const KEY_MAP = {
  CHAI_0: 'CHECHAI_0', CHAI_10: 'CHECHAI_10',
  AIPAO95: 'AIPAO_GAS_95', AIPAO98: 'AIPAO_GAS_98',
  AIPAOE92: 'AIPAO_GAS_E92', AIPAOE95: 'AIPAO_GAS_E95', AIPAOE98: 'AIPAO_GAS_E98'
};

const TARGET_FUELS = ['GAS_92', 'GAS_95', 'GAS_98', 'AIPAO98', 'CHAI_0'];

const getEnv = (env, names, fallback = '') => {
  for (const name of names) {
    const value = env?.[name];
    if (value !== undefined && value !== null && String(value).trim() !== '') return String(value).trim();
  }
  return fallback;
};

const toNumber = (v, fallback) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

const normalizeProvince = (value) => {
  const raw = String(value || '').trim();
  if (!raw) return '51';
  if (PROVINCES[raw]) return raw;
  const cleaned = raw.replace(/省|市|自治区|壮族|回族|维吾尔/g, '');
  const found = Object.entries(PROVINCES).find(([, name]) => name === cleaned || name.includes(cleaned) || cleaned.includes(name));
  return found ? found[0] : raw;
};

const parseSetCookie = (headers) => {
  let values = [];
  if (headers?.getAll) { try { const v = headers.getAll('set-cookie'); if (v) values = values.concat(v); } catch (_) {} }
  if (!values.length && headers?.get) { try { const v = headers.get('set-cookie'); if (v) values = values.concat(Array.isArray(v) ? v : [v]); } catch (_) {} }
  return values
    .flatMap((v) => Array.isArray(v) ? v : String(v).split(/,\s*(?=[A-Za-z0-9_]+=)/))
    .map((v) => String(v).split(';')[0].trim())
    .filter(Boolean)
    .join(';');
};

const stringToBase64 = (str) => {
  if (typeof Buffer !== 'undefined') return Buffer.from(str, 'utf8').toString('base64');
  const encoded = encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
  return btoa(encoded);
};

const lineChartSVG = (arr, { color = '#34C759', width = 120, height = 34, lineWidth = 2 } = {}) => {
  const nums = (arr || []).map(Number).filter(Number.isFinite).slice(-12);
  if (nums.length < 2) return null;

  const pad = Math.max(3, Math.ceil(lineWidth));
  const min = Math.min(...nums);
  const max = Math.max(...nums);
  const range = max - min || 1;
  const points = nums.map((n, i) => {
    const x = pad + (width - pad * 2) * (i / (nums.length - 1));
    const y = pad + (height - pad * 2) * (1 - ((n - min) / range));
    return `${x.toFixed(2)},${y.toFixed(2)}`;
  });
  const bottom = height - pad;
  const area = `${points[0]} ${points.slice(1).join(' ')} ${width - pad},${bottom} ${pad},${bottom}`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><defs><linearGradient id="fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${color}" stop-opacity="0.28"/><stop offset="1" stop-color="${color}" stop-opacity="0"/></linearGradient></defs><polygon points="${area}" fill="url(#fill)"/><polyline points="${points.join(' ')}" fill="none" stroke="${color}" stroke-width="${lineWidth}" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"/></svg>`;
  return `data:image/svg+xml;base64,${stringToBase64(svg)}`;
};

const COMMON_HEADERS = {
  'Accept': 'application/json, text/plain, */*',
  'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148',
  'Referer': `${BASE}/index.html`,
  'Origin': 'https://cx.sinopecsales.com'
};

async function readJSONResponse(resp) {
  const textBody = await resp.text();
  try { return JSON.parse(textBody); } catch (e) { throw new Error(`接口异常 HTTP ${resp.status || ''}`); }
}

async function loadData(ctx, province) {
  const initResp = await ctx.http.get(`${BASE}/data/initMainData`, { headers: COMMON_HEADERS, credentials: 'include', timeout: 15000 });
  const initJSON = await readJSONResponse(initResp);
  const cookie = parseSetCookie(initResp.headers);

  let current = initJSON;
  const headers = { ...COMMON_HEADERS, 'Content-Type': 'application/json;charset=UTF-8' };
  if (cookie) headers.Cookie = cookie;
  const resp = await ctx.http.post(`${BASE}/data/switchProvince`, {
    headers, body: { provinceId: String(province) }, credentials: 'include', timeout: 15000
  });
  const switched = await readJSONResponse(resp);
  if (switched?.data?.provinceCheck || switched?.data?.area?.length) current = switched;

  const histResp = await ctx.http.get(`${BASE}/data/initOilPrice`, {
    headers: cookie ? { ...COMMON_HEADERS, Cookie: cookie } : COMMON_HEADERS, credentials: 'include', timeout: 15000
  });
  const history = await readJSONResponse(histResp);
  return { current, history };
}

function resolveAreaIndex(current, cityName, explicitIndex) {
  if (explicitIndex != null && explicitIndex >= 0) return explicitIndex;
  const area = (current.data || current).area || [];
  if (!area.length || !cityName) return 0;
  const target = String(cityName).trim();
  const idx = area.findIndex((a) => {
    const name = a?.areaCheck?.AREA_NAME || a?.areaCheck?.CITY_NAME || a?.areaCheck?.PROVINCE_NAME || a?.areaName || '';
    return name && (name.includes(target) || target.includes(name));
  });
  return idx >= 0 ? idx : 0;
}

function extractItems(current, history, province, areaIndex, targetKeys, offsetScale) {
  let { provinceCheck, provinceData, area } = current.data || current;
  area = area || [];
  let areaName = '';
  if (area.length) {
    const idx = Math.max(0, Math.min(area.length - 1, areaIndex));
    provinceCheck = area[idx].areaCheck;
    provinceData = area[idx].areaData;
    areaName = area[idx]?.areaCheck?.AREA_NAME || area[idx]?.areaCheck?.CITY_NAME || area[idx]?.areaName || '';
  }

  const historyData = (((history.data || {}).area || []).length
    ? history.data.area[Math.max(0, Math.min(history.data.area.length - 1, areaIndex))].areaData
    : (history.data || {}).provinceData || []
  ).slice().reverse();

  const items = [];
  for (const [rawKey, name] of NAMES) {
    if (!targetKeys.includes(rawKey)) continue;
    if (provinceCheck?.[rawKey] === 'Y') {
      const key = KEY_MAP[rawKey] || rawKey;
      const offset = Number(provinceData?.[`${key}_STATUS`] ?? 0) * offsetScale;
      const series = historyData.map((it) => it?.[key]).map(Number).filter(Number.isFinite);
      items.push({ rawKey, key, name, price: provinceData?.[key], offset, series, up: offset > 0 });
    }
  }
  return { provinceName: provinceCheck?.PROVINCE_NAME || PROVINCES[province] || String(province), areaName, items };
}

export default async function (ctx) {
  const env = ctx.env || {};
  const provinceCode = normalizeProvince(getEnv(env, ['PROVINCE', 'PROVINCE_ID', 'province'], '51'));
  const cityName = getEnv(env, ['CITY', 'city'], '成都');
  const explicitArea = (() => {
    const raw = getEnv(env, ['AREA', 'AREA_INDEX', 'area'], '');
    return raw === '' ? null : toNumber(raw, null);
  })();
  const offsetScale = toNumber(getEnv(env, ['OFFSET_SCALE', 'offset_scale'], '1'), 1);

  const family  = (ctx.widgetFamily || 'systemMedium').toLowerCase();
  const isSmall = family.includes('small');
  const isLarge = family.includes('large');

  const now = new Date();
  const Y   = now.getFullYear();
  const P   = n => String(n).padStart(2, "0");
  const updateTimeStr = `${P(now.getMonth()+1)}.${P(now.getDate())} ${P(now.getHours())}:${P(now.getMinutes())}`;
  const shortTimeStr = `${P(now.getHours())}:${P(now.getMinutes())}`;

  const C = {
    bg:      [{ light: '#FAFAFA', dark: '#1C1C1E' }, { light: '#EFEFF4', dark: '#111113' }],
    card:    { light: '#FFFFFF', dark: '#2C2C2E' },
    main:    { light: '#1C1C1E', dark: '#F2F2F7' },
    muted:   { light: '#8E8E93', dark: '#636366' },
    gold:    { light: '#B07C1A', dark: '#D4A02A' },
    red:     { light: '#C0392B', dark: '#FF453A' },
    teal:    { light: '#1E7E44', dark: '#30D158' },
    blue:    { light: '#2C5F8A', dark: '#5E9ED6' },
    divider: { light: '#E5E5EA', dark: '#38383A' }
  };

  const CALENDAR_2026 = [
    [1,12],[1,23],[2,9],[2,23],[3,9],[3,23],[4,7],[4,21],[5,8],[5,22],
    [6,5],[6,19],[7,3],[7,17],[7,31],[8,14],[8,28],[9,11],[9,25],
    [10,14],[10,28],[11,11],[11,25],[12,9],[12,23]
  ];

  const getNextAdjust = () => {
    const next = CALENDAR_2026.find(([m, d]) => new Date(Y, m - 1, d, 23, 59, 59).getTime() > now.getTime());
    if (!next) return { dateStr: "待更新", countdown: "", isUrgent: false };
    const targetDate = new Date(Y, next[0] - 1, next[1], 23, 59, 59);
    const totalHours = Math.floor((targetDate.getTime() - now.getTime()) / 3600000);
    const days  = Math.floor(totalHours / 24);
    const hours = totalHours % 24;
    return {
      dateStr:   `${P(targetDate.getMonth() + 1)}.${P(targetDate.getDate())} 24:00`,
      countdown: `(${days}d${hours}h后)`,
      isUrgent:  totalHours < 72
    };
  };
  const nextAdjust = getNextAdjust();

  const prices = { p92: null, p95: null, p98: null, diesel: null };
  const items  = { p92: null, p95: null, p98: null, diesel: null };
  let regionName = cityName || "全国";
  let trendLabel = "较上次调整: ";
  let trendInfo  = "";
  let trendColor = C.muted;
  let hasTrendData = false; 
  let fetchError = null;

  try {
    const { current, history } = await loadData(ctx, provinceCode);
    const areaIndex = resolveAreaIndex(current, cityName, explicitArea);
    const payload = extractItems(current, history, provinceCode, areaIndex, TARGET_FUELS, offsetScale);

    regionName = cityName || payload.provinceName || regionName;

    const found = {};
    for (const it of payload.items) found[it.rawKey] = it;
    items.p92    = found.GAS_92 || null;
    items.p95    = found.GAS_95 || null;
    items.p98    = found.GAS_98 || found.AIPAO98 || null;
    items.diesel = found.CHAI_0 || null;

    prices.p92    = items.p92    && items.p92.price    != null ? Number(items.p92.price)    : null;
    prices.p95    = items.p95    && items.p95.price    != null ? Number(items.p95.price)    : null;
    prices.p98    = items.p98    && items.p98.price    != null ? Number(items.p98.price)    : null;
    prices.diesel = items.diesel && items.diesel.price  != null ? Number(items.diesel.price) : null;

    const offsets = [items.p92, items.p95, items.p98, items.diesel]
      .filter(Boolean)
      .map((it) => it.offset)
      .filter((v) => v !== null && v !== undefined && !isNaN(v) && v !== 0);

    if (offsets.length) {
      hasTrendData = true; 
      const sumSign = offsets.reduce((a, b) => a + b, 0);
      const overallUp = sumSign >= 0;
      const absVals = offsets.map((v) => Math.abs(v));
      const minAbs = Math.min(...absVals).toFixed(2);
      const maxAbs = Math.max(...absVals).toFixed(2);
      const rangeStr = minAbs === maxAbs ? `${minAbs}¥/L` : `${minAbs}-${maxAbs}¥/L`;
      trendColor = overallUp ? C.red : C.teal;
      trendInfo  = `${overallUp ? "↑" : "↓"} ${rangeStr}`;
    }
  } catch (e) {
    fetchError = e && e.message ? e.message : String(e);
  }

  const PRICE_ITEMS = [
    { label: "92号", key: "p92",    color: C.gold,   hex: '#D4A02A', item: items.p92 },
    { label: "95号", key: "p95",    color: C.red,    hex: '#FF453A', item: items.p95 },
    { label: "98号", key: "p98",    color: C.blue,   hex: '#2F80ED', item: items.p98 },
    { label: "柴油", key: "diesel", color: C.teal,   hex: '#27AE60', item: items.diesel }
  ].map(i => ({ ...i, val: prices[i.key] !== null ? prices[i.key].toFixed(2) : "--" }));

  const mkText = (text, size, weight, color, opts = {}) => ({
    type: "text", text: String(text ?? ""), font: { size, weight, ...(opts.family ? { family: opts.family } : {}) }, textColor: color, ...opts
  });

  const mkRow = (children, gap = 4, opts = {}) => ({
    type: "stack", direction: "row", alignItems: "center", gap, children, ...opts
  });

  const mkIcon = (src, color, size = 13) => ({
    type: "image", src: `sf-symbol:${src}`, color, width: size, height: size
  });

  const mkSpacer = (length) => length != null ? { type: "spacer", length } : { type: "spacer" };

  const fmtDelta = (item) => {
    if (!item.item || item.item.offset === null || item.item.offset === undefined || isNaN(item.item.offset)) return null;
    const off = item.item.offset;
    if (off === 0) return null;
    return { text: `${off > 0 ? "+" : ""}${off.toFixed(2)}`, color: off > 0 ? C.red : C.teal };
  };

  const buildPriceCard = (item, config) => {
    const delta = fmtDelta(item);
    const showCurve = config.showCurve && item.item && item.item.series && item.item.series.length > 1;
    let svgUrl = null;

    if (showCurve) {
      svgUrl = lineChartSVG(item.item.series, { color: item.hex, width: config.curveWidth, height: config.curveHeight, lineWidth: 1.8 });
    }

    return {
      type: "stack", direction: "column", alignItems: "center", flex: 1,
      backgroundColor: C.card, borderRadius: config.radius, padding: config.padding,
      children: [
        mkSpacer(),
        mkText(item.label, config.labelFz, config.labelWeight, item.color),
        mkSpacer(config.innerGap),
        mkText(item.val, config.valFz, "heavy", C.main),
        mkSpacer(config.deltaGap ?? 2),
        delta ? mkText(delta.text, config.deltaFz, "bold", delta.color) : mkText(" ", config.deltaFz, "bold", C.muted),
        ...(svgUrl ? [
          mkSpacer(config.curveGap ?? 6),
          { type: "image", src: svgUrl, width: config.curveWidth, height: config.curveHeight, resizable: true, resizeMode: "contain" }
        ] : []),
        mkSpacer()
      ]
    };
  };

  const backgroundGradient = { type: 'linear', colors: C.bg, startPoint: { x: 0, y: 0 }, endPoint: { x: 1, y: 1 } };

  if (fetchError) {
    return {
      type: "widget", padding: 16, backgroundGradient,
      children: [
        mkRow([mkIcon("fuelpump.circle.fill", C.red, 16), mkSpacer(4), mkText("油价加载失败", 15, "heavy", C.main)], 0),
        mkSpacer(8), mkText(fetchError, 11, "medium", C.muted, { maxLines: 3 })
      ]
    };
  }

  if (isSmall) {
    const cardCfg = { radius: 10, padding: [4, 2, 4, 2], labelFz: 10, labelWeight: "bold", valFz: 14, innerGap: 1, deltaFz: 9, deltaGap: 1 };
    return {
      type: "widget", padding: [12, 12, 8, 12], url: BASE, backgroundGradient,
      children: [
        mkRow([
          mkIcon("fuelpump.circle.fill", C.main, 13), mkSpacer(4), 
          mkText(`${regionName}油价`, 13, "heavy", C.main),
          mkSpacer(), 
          mkIcon("arrow.triangle.2.circlepath", C.muted, 9), mkSpacer(2),
          mkText(shortTimeStr, 9, "bold", C.muted, { family: "Menlo" })
        ], 0),
        mkSpacer(7),
        { type: "stack", direction: "column", gap: 8, flex: 1, children: [
          mkRow(PRICE_ITEMS.slice(0, 2).map(item => buildPriceCard(item, cardCfg)), 6, { flex: 1 }),
          mkRow(PRICE_ITEMS.slice(2, 4).map(item => buildPriceCard(item, cardCfg)), 6, { flex: 1 })
        ]},
        mkSpacer(7),
        mkRow([ mkSpacer(), mkIcon("clock.fill", nextAdjust.isUrgent ? C.red : C.muted, 9), mkSpacer(3), mkText(`下轮调价: ${nextAdjust.dateStr}`, 9, "bold", nextAdjust.isUrgent ? C.red : C.muted) ], 0)
      ]
    };
  }

  if (isLarge) {
    const cardCfg = { 
      radius: 14, padding: [10, 4, 10, 4], labelFz: 14, labelWeight: "heavy", 
      valFz: 24, innerGap: 4, deltaFz: 12, deltaGap: 2,
      showCurve: true, curveWidth: 84, curveHeight: 26, curveGap: 5
    };
    const infoColor = nextAdjust.isUrgent ? C.red : C.gold;

    return {
      type: "widget", padding: [16, 16, 14, 16], url: BASE, backgroundGradient,
      children: [
        mkRow([
          mkIcon("fuelpump.circle.fill", C.main, 17), mkSpacer(4),
          mkText(`${regionName}油价`, 16, "heavy", C.main), mkSpacer(),
          mkText("下轮调价: ", 12, "medium", infoColor),
          mkText(nextAdjust.dateStr, 12, "bold", infoColor),
          mkText(` ${nextAdjust.countdown}`, 12, "bold", infoColor)
        ], 0),
        mkSpacer(14), 
        { type: "stack", direction: "column", gap: 12, flex: 1, children: [
          mkRow(PRICE_ITEMS.slice(0, 2).map(item => buildPriceCard(item, cardCfg)), 12, { flex: 1 }),
          mkRow(PRICE_ITEMS.slice(2, 4).map(item => buildPriceCard(item, cardCfg)), 12, { flex: 1 })
        ]},
        mkSpacer(12),
        { type: "stack", height: 0.5, backgroundColor: C.divider, borderRadius: 1, children: [] },
        mkSpacer(8),
        mkRow([
          ...(hasTrendData ? [
            mkRow([mkText(trendLabel, 11, "medium", C.muted), mkText(trendInfo, 11, "bold", trendColor, { maxLines: 1 })], 2)
          ] : []),
          mkSpacer(),
          mkRow([mkIcon("arrow.triangle.2.circlepath", C.muted, 12), mkSpacer(4), mkText(updateTimeStr, 11, "bold", C.muted, { family: "Menlo" })], 0)
        ], 0)
      ]
    };
  }

  const cardCfgMed = { radius: 13, padding: [12, 6, 12, 6], labelFz: 11, labelWeight: "bold", valFz: 18, innerGap: 4, deltaFz: 11, deltaGap: 2 };
  const infoColorMed = nextAdjust.isUrgent ? C.red : C.gold;

  return {
    type: "widget", padding: [10, 12, 6, 12], url: BASE, backgroundGradient,
    children: [
      mkRow([
        mkIcon("fuelpump.circle.fill", C.main, 16), mkSpacer(2),
        mkText(`${regionName}油价`, 15, "heavy", C.main), mkSpacer(),
        mkText("下轮调价: ", 11, "medium", infoColorMed),
        mkText(nextAdjust.dateStr, 11, "bold", infoColorMed),
        mkText(` ${nextAdjust.countdown}`, 11, "bold", infoColorMed)
      ], 0),
      mkSpacer(24), 
      mkRow(PRICE_ITEMS.map(item => buildPriceCard(item, cardCfgMed)), 6),
      mkSpacer(15), 
      { type: "stack", height: 0.5, backgroundColor: C.divider, borderRadius: 1, children: [] },
      mkSpacer(8), 
      mkRow([
        ...(hasTrendData ? [
          mkRow([mkText(trendLabel, 11, "medium", C.muted), mkText(trendInfo, 11, "bold", trendColor, { maxLines: 1 })], 2)
        ] : []),
        mkSpacer(),
        mkRow([mkIcon("arrow.triangle.2.circlepath", C.muted, 11), mkSpacer(4), mkText(updateTimeStr, 10, "bold", C.muted, { family: "Menlo" })], 0)
      ], 0)
    ]
  };
}
/**
 * ==========================================
 * 📌 岁时黄历 (Almanac) 小组件
 *
 * 【功能说明】
 * • 尺寸支持：适配小号（农历信息全量）、中号（黄历基础布局）、大号（增加节气展示及换行处理）。
 * • 农历引擎：本地计算干支、生肖、农历日期及二十四节气。
 * • 节气修复：已修复当天节气倒计时差 1 天的问题，当天显示为“今日”。
 * • 自动换行：已修复中号组件宜忌超长产生省略号的问题，全量支持第二行自动换行。
 * • 远程数据：请求 openApiData 获取宜忌、冲煞及运势评分，网络异常时支持本地容错降级。
 * • 顶部角标：支持「星座」与「周次」双模式切换。星座模式可附带教学周进度，周次模式纯净显示年/周次及年内天数。
 *
 * 🔗 引用链接: https://raw.githubusercontent.com/jnlaoshu/MySelf/master/Egern/Widget/Almanac.js
 * ⏱️ 更新时间: 2026.05.05 17:00 (修复节气对齐与换行)
 * ==========================================
 */

export default async function(ctx) {
  // ── 环境变量 ──────────────────────────────────────────────────────────────
  const envMode    = String(ctx.env?.ASTRO_OR_WEEK       ?? '').trim();
  const SHOW_MODE  = (envMode === '周次' || envMode.toLowerCase() === 'week') ? 'week' : 'astro';
  const envShowTW  = String(ctx.env?.SHOW_TEACHING_WEEK  ?? 'true').trim().toLowerCase();
  const envTWStart = String(ctx.env?.TEACHING_WEEK_START ?? '').trim();

  // ── 尺寸检测 ──────────────────────────────────────────────────────────────
  const family  = (ctx.widgetFamily || 'systemMedium').toLowerCase();
  const isSmall = family.includes('small');
  const isLarge = family.includes('large');

  // ── 色彩令牌 ──────────────────────────────────────────────────────────────
  const C = {
    bg:          [{ light: '#FFFFFF', dark: '#1C1C1E' }, { light: '#F2F2F7', dark: '#0C0C0E' }],
    main:        { light: '#1C1C1E', dark: '#FFFFFF'  },
    sub:         { light: '#48484A', dark: '#D1D1D6'  },
    muted:       { light: '#8E8E93', dark: '#8E8E93'  },
    divider:     { light: '#E5E5EA', dark: '#38383A'  },
    gold:        { light: '#B58A28', dark: '#D6A53A'  },
    yi:          { light: '#2E8045', dark: '#32D74B'  },
    ji:          { light: '#CA3B32', dark: '#FF453A'  },
    term:        { light: '#628C7B', dark: '#73A491'  },
    transparent: '#00000000'
  };

  // ── UI 基础构建器 ─────────────────────────────────────────────────────────
  const mkText   = (text, size, weight, color, opts = {}) => ({ type: "text", text: String(text), font: { size, weight }, textColor: color, ...opts });
  const mkRow    = (children, gap = 4, opts = {}) => ({ type: "stack", direction: "row", alignItems: "center", gap, children, ...opts });
  const mkIcon   = (src, color, size = 13) => ({ type: "image", src: `sf-symbol:${src}`, color, width: size, height: size });
  const mkSpacer = (length) => length != null ? { type: "spacer", length } : { type: "spacer" };

  // ── 时间基准（强制 UTC+8 且消除时分秒误差）─────────────────────────────
  const tzOffset = new Date().getTimezoneOffset();
  const now      = new Date(Date.now() + (tzOffset + 480) * 60000);
  const [Y, M, D] = [now.getFullYear(), now.getMonth() + 1, now.getDate()];
  const WEEK = "日一二三四五六"[now.getDay()];
  const P = n => String(n).padStart(2, '0');
  
  // 零点时间戳，用于计算绝对天数差，防止 12 小时制带来的 1 天误差漂移
  const todayZeroMs = new Date(Y, M - 1, D, 0, 0, 0).getTime();

  // ── 教学周计算（仅在星座模式下计算并显示） ──────────────────────────────────
  let teachingWeekStr = "";
  if (SHOW_MODE === 'astro' && envShowTW === 'true' && envTW

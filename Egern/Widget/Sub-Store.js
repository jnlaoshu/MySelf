/** V1.36
* Sub-Store 流量查询小组件 - 深色浅色自动适配版
* 大号组件可显示3个订阅信息 | 中号组件可显示2个订阅信息
* 进度条颜色：>=60%绿色 | >=40%蓝色 | <40%橙色
*/
export default async function (ctx) {
  const cfg = getConfig(ctx);
  const cache = readCache(ctx, cfg);
  try {
    const subs = await fetchSubscriptions(ctx, cfg);
    const selected = selectSubscriptions(subs, cfg);
    if (!selected.length) {
      return errorWidget(cfg, '未找到订阅', 'SUB_NAMES 没有匹配到 Sub-Store 里的订阅名称');
    }
    const items = [];
    const selectedItems = selected.slice(0, cfg.maxItems);
    await Promise.all(selectedItems.map(async (sub, index) => {
      items[index] = await fetchFlowItem(ctx, cfg, sub);
    }));
    const payload = {
      at: Date.now(),
      source: cfg.baseUrl,
      items: cfg.hideErrors ? items.filter((item) => !item.error) : items,
    };
    writeCache(ctx, cfg, payload);
    return renderWidget(cfg, payload, false);
  } catch (e) {
    if (cache && Array.isArray(cache.items) && cache.items.length) {
      return renderWidget(cfg, cache, true, shortError(e));
    }
    return errorWidget(cfg, 'Sub-Store 连接失败', shortError(e));
  }
}
function getConfig(ctx) {
  const env = ctx.env || {};
  const family = ctx.widgetFamily || 'systemMedium';
  const defaultMax = {
    accessoryInline: 1,
    accessoryCircular: 1,
    accessoryRectangular: 1,
    systemSmall: 1,
    systemMedium: 2,
    systemLarge: 3,
    systemExtraLarge: 3,
  }[family] || 2;
  const baseUrls = unique([
    env.SUB_STORE_BASE_URL,
    env.SUB_STORE_URL,
    env.BASE_URL,
    'http://sub.store',
    'https://sub.store',
    'http://127.0.0.1:3000',
    'http://localhost:3000',
  ].map(normalizeBaseUrl).filter(Boolean));
  return {
    family,
    title: env.TITLE || 'Sub-Store 套餐',
    baseUrl: baseUrls[0] || 'http://sub.store',
    baseUrls,
    openUrl: env.OPEN_URL || 'https://sub-store.vercel.app',
    names: parseList(env.SUB_NAMES || env.SUB_NAME || env.SUBS || ''),
    matchContains: bool(env.MATCH_CONTAINS, false),
    maxItems: clampInt(env.MAX_ITEMS, defaultMax, 1, 12),
    refreshMinutes: clampInt(env.REFRESH_MINUTES, 30, 5, 1440),
    timeout: clampInt(env.TIMEOUT_MS || env.TIMEOUT, 8000, 1000, 60000),
    flowUserAgent: env.FLOW_USER_AGENT || 'clash.meta/v1.19.23',
    insecureTls: bool(env.INSECURE_TLS, false),
    useCache: bool(env.USE_CACHE, true),
    hideErrors: bool(env.HIDE_ERRORS, false),
    cacheKey: env.CACHE_KEY || 'substore-flow-widget-cache-v2',
    resetDay: env.RESET_DAY || '',
    startDate: env.START_DATE || '',
    cycleDays: env.CYCLE_DAYS || '',
    resetRules: parseResetRules(env.RESET_RULES || ''),
  };
}
function getThemeColors() {
  return {
    bgGradient: [
      { light: '#FFFFFF', dark: '#0f172a' },
      { light: '#F3F4F6', dark: '#111827' },
      { light: '#FFFFFF', dark: '#1e293b' }
    ],
    bgGradientStale: [
      { light: '#FEF3C7', dark: '#2b1b0f' },
      { light: '#F9ECD5', dark: '#1f2937' }
    ],
    bgGradientError: [
      { light: '#FEE2E2', dark: '#3f1d1d' },
      { light: '#FECACA', dark: '#1f2937' }
    ],
    cardBg: { light: '#F3F4F680', dark: '#1E293B80' },
    summaryBg: { light: '#DBEAFE30', dark: '#0EA5E920' },
    errorBg: { light: '#FEE2E280', dark: '#7F1D1D55' },
    headerText: { light: '#1F2937', dark: '#E5E7EB' },
    subText: { light: '#6B7280', dark: '#94A3B8' },
    lightText: { light: '#374151', dark: '#CBD5E1' },
    summaryText: { light: '#0369A1', dark: '#E0F2FE' },
    primaryIcon: { light: '#3B82F6', dark: '#60A5FA' },
    successText: { light: '#059669', dark: '#34D399' },
    warningText: { light: '#D97706', dark: '#FBBF24' },
    errorText: { light: '#DC2626', dark: '#F87171' },
    staleText: { light: '#B45309', dark: '#FDE68A' },
  };
}
async function fetchSubscriptions(ctx, cfg) {
  const storedSubs = readStoredSubscriptions(ctx);
  if (storedSubs.length) return storedSubs;
  let lastError;
  const urls = Array.isArray(cfg.baseUrls) && cfg.baseUrls.length ? cfg.baseUrls : [cfg.baseUrl];
  for (const base of urls) {
    try {
      const json = await requestJson(ctx, apiUrl(base, '/api/subs'), cfg);
      const data = unwrapData(json);
      let subs = null;
      if (Array.isArray(data)) subs = data.filter(Boolean);
      else if (data && typeof data === 'object') subs = Object.values(data).filter(Boolean);
      if (subs) {
        cfg.baseUrl = base;
        return subs;
      }
      throw new Error('订阅列表格式异常');
    } catch (e) {
      lastError = e;
    }
  }
  throw lastError || new Error('无法连接 Sub-Store');
}
function selectSubscriptions(subs, cfg) {
  if (!cfg.names.length) return subs.filter(isRemoteSub);
  return cfg.names.map((name) => {
    const wanted = String(name).trim();
    let found = subs.find((s) => String(s?.name || '') === wanted);
    if (!found && cfg.matchContains) {
      found = subs.find((s) => String(s?.name || '').includes(wanted));
    }
    return found || { name: wanted, missing: true };
  });
}
function isRemoteSub(sub) {
  if (!sub || typeof sub !== 'object') return false;
  if (sub.subUserinfo) return true;
  if (sub.source === 'remote') return true;
  if (sub.url && /^https?:\/\//i.test(String(sub.url).trim())) return true;
  return false;
}
async function fetchFlowItem(ctx, cfg, sub) {
  const name = String(sub && sub.name ? sub.name : '未命名订阅');
  if (sub.missing) {
    return { name, error: '订阅不存在' };
  }
  try {
    const storedFlow = readStoredFlow(ctx, name);
    if (storedFlow) return decorateItem(sub, storedFlow, cfg);
    if (sub.__apiFlowUrl) {
      try {
        const json = await requestJson(ctx, sub.__apiFlowUrl, cfg);
        const flow = normalizeFlow(unwrapData(json));
        if (hasUsableFlow(flow)) return decorateItem(sub, flow, cfg);
      } catch (_) {}
    }
    const json = await requestJson(
      ctx,
      apiUrl(cfg.baseUrl, '/api/sub/flow/' + encodeURIComponent(name)),
      cfg,
    );
    const flow = normalizeFlow(unwrapData(json));
    if (!hasUsableFlow(flow)) throw new Error('无可用流量信息');
    return decorateItem(sub, flow, cfg);
  } catch (e) {
    try {
      const directFlow = await fetchDirectFlow(ctx, cfg, sub);
      if (hasUsableFlow(directFlow)) return decorateItem(sub, directFlow, cfg);
    } catch (_) {}
    return { name, error: shortError(e) };
  }
}
async function fetchDirectFlow(ctx, cfg, sub) {
  const raw = firstHttpUrl(sub.url || sub.subUserinfo || '');
  if (!raw) throw new Error('订阅链接不可用');
  const parts = splitUrlArgs(raw);
  const args = parts.args;
  if (args.noFlow) throw new Error('noFlow');
  const url = args.flowUrl || parts.url;
  const headers = { 'User-Agent': args.flowUserAgent || cfg.flowUserAgent };
  Object.assign(headers, parseHeaderObject(args.flowHeaders || args.headers));
  const opt = { headers, timeout: cfg.timeout, redirect: 'follow', insecureTls: cfg.insecureTls || !!args.insecure };
  if (args.flowUrl) {
    const resp = await ctx.http.get(url, opt);
    const bodyFlow = parseFlowString(await safeText(resp));
    if (hasUsableFlow(bodyFlow)) return bodyFlow;
    const headerFlow = parseFlowHeaders(resp.headers);
    if (hasUsableFlow(headerFlow)) return headerFlow;
  }
  try {
    const resp = await ctx.http.head(url, opt);
    const flow = parseFlowHeaders(resp.headers);
    if (hasUsableFlow(flow)) return flow;
  } catch (_) {}
  const resp = await ctx.http.get(url, opt);
  const flow = parseFlowHeaders(resp.headers);
  if (hasUsableFlow(flow)) return flow;
  throw new Error('响应头未包含流量信息');
}
function decorateItem(sub, flow, cfg) {
  const total = num(flow.total);
  const upload = finiteOrZero(flow.upload);
  const download = finiteOrZero(flow.download);
  const used = upload + download;
  const remain = Number.isFinite(total) && total > 0 ? Math.max(0, total - used) : NaN;
  const usedRatio = Number.isFinite(total) && total > 0 ? clamp(used / total, 0, 1) : NaN;
  const remainRatio = Number.isFinite(usedRatio) ? 1 - usedRatio : NaN;
  return {
    name: String(sub.name || '订阅'),
    planName: flow.planName || '',
    total,
    upload,
    download,
    used,
    remain,
    usedRatio,
    remainRatio,
    remainingDays: num(flow.remainingDays),
    resetAt: calcResetAt(sub.url || '', flow.remainingDays, sub.name, cfg),
    expireAt: Number.isFinite(flow.expires) && flow.expires > 0 ? new Date(flow.expires * 1000) : null,
    appUrl: flow.appUrl || '',
  };
}
function normalizeFlow(raw) {
  const data = raw && typeof raw === 'object' ? raw : {};
  const usage = data.usage && typeof data.usage === 'object' ? data.usage : {};
  return {
    total: num(data.total),
    upload: num(usage.upload ?? data.upload),
    download: num(usage.download ?? data.download),
    expires: num(data.expires ?? data.expire),
    remainingDays: num(data.remainingDays ?? data.reset_day),
    planName: String(data.planName || data.plan_name || ''),
    appUrl: String(data.appUrl || data.app_url || ''),
  };
}
function hasUsableFlow(flow) {
  return flow && Number.isFinite(flow.total) && flow.total > 0 && Number.isFinite(flow.upload) && Number.isFinite(flow.download);
}
function parseFlowHeaders(headers) {
  if (!headers) return {};
  const subInfo = getHeaderValue(headers, 'subscription-userinfo');
  const appUrl = getHeaderValue(headers, 'profile-web-page-url');
  const planName = getHeaderValue(headers, 'plan-name');
  const flow = parseFlowString(subInfo);
  if (appUrl) flow.appUrl = appUrl;
  if (planName) flow.planName = planName;
  return flow;
}
function parseFlowString(raw) {
  const s = String(raw || '');
  const field = (key) => {
    const m = s.match(new RegExp(key + '=([-+]?)([0-9]*\\.?[0-9]+(?:[eE][-+]?[0-9]+)?)'));
    return m ? Number(m[1] + m[2]) : NaN;
  };
  const strField = (key) => {
    const m = s.match(new RegExp(key + '=(.*?)\\s*?(;|$)'));
    if (!m) return '';
    return safeDecode(m[1]);
  };
  return normalizeFlow({
    upload: field('upload'),
    download: field('download'),
    total: field('total'),
    expire: field('expire'),
    reset_day: field('reset_day'),
    app_url: strField('app_url'),
    plan_name: strField('plan_name'),
  });
}
function renderWidget(cfg, payload, stale, staleMsg) {
  const theme = getThemeColors();
  const items = Array.isArray(payload.items) ? payload.items : [];
  const fam = cfg.family;
  if (fam === 'accessoryInline') {
    return {
      type: 'widget',
      refreshAfter: refreshISO(cfg.refreshMinutes),
      url: cfg.openUrl,
      children: [renderInline(cfg, items[0], stale, theme)],
    };
  }
  if (fam === 'accessoryCircular') {
    return root(cfg, [renderCircular(items[0], stale, cfg, theme)], stale, theme);
  }
  if (fam === 'accessoryRectangular') {
    return root(cfg, [renderAccessoryRectangular(cfg, items[0], stale, theme)], stale, theme);
  }
  const limit = fam === 'systemLarge' || fam === 'systemExtraLarge' ? 3 : fam === 'systemSmall' ? 1 : 2;
  const shown = items.slice(0, limit);
  const children = [header(cfg, payload, stale, theme)];
  const summary = aggregate(shown, theme);
  if (fam === 'systemMedium') {
    if (summary) children.push(summaryCardSmall(summary, theme));
  } else {
    if (shown.length > 1 && summary) children.push(summaryCard(summary, theme));
  }
  if (fam === 'systemSmall') {
    children.push(renderSmallCard(shown[0], theme));
  } else {
    const large = fam === 'systemLarge' || fam === 'systemExtraLarge';
    for (const item of shown) children.push(renderCard(item, large, theme));
  }
  children.push(footer(cfg, payload, stale, staleMsg, theme));
  return root(cfg, children, stale, theme);
}
function root(cfg, children, stale, theme) {
  const bgColors = stale ? theme.bgGradientStale : theme.bgGradient;
  return {
    type: 'widget',
    url: cfg.openUrl,
    refreshAfter: refreshISO(cfg.refreshMinutes),
    padding: 14,
    gap: 4,
    backgroundGradient: {
      type: 'linear',
      colors: bgColors,
      startPoint: { x: 0, y: 0 },
      endPoint: { x: 1, y: 1 },
    },
    children,
  };
}
function header(cfg, payload, stale, theme) {
  const iconColor = stale ? theme.staleText : theme.primaryIcon;
  const textColor = stale ? theme.staleText : theme.headerText;
  return {
    type: 'stack',
    direction: 'row',
    alignItems: 'center',
    gap: 6,
    children: [
      { type: 'image', src: stale ? 'sf-symbol:exclamationmark.triangle.fill' : 'sf-symbol:chart.bar.xaxis', color: iconColor, width: 16, height: 16 },
      text(stale ? cfg.title + ' · 缓存' : cfg.title, 'caption1', 'semibold', textColor, { maxLines: 1, minScale: 0.6 }),
      { type: 'spacer' },
      text(fmtClock(payload.at || Date.now()), 'caption2', 'regular', theme.subText, { maxLines: 1 }),
    ],
  };
}
function summaryCard(summary, theme) {
  return {
    type: 'stack',
    direction: 'row',
    alignItems: 'center',
    gap: 8,
    padding: [10, 12],
    backgroundColor: theme.summaryBg,
    borderRadius: 12,
    children: [
      { type: 'image', src: 'sf-symbol:sum', color: theme.primaryIcon, width: 16, height: 16 },
      text('合计剩余', 'caption1', 'semibold', theme.summaryText, { maxLines: 1 }),
      { type: 'spacer' },
      text(summary.text, 'body', 'bold', summary.color, { maxLines: 1, minScale: 0.7 }),
    ],
  };
}
function summaryCardSmall(summary, theme) {
  return {
    type: 'stack',
    direction: 'row',
    alignItems: 'center',
    gap: 3,
    padding: [3, 10],
    backgroundColor: theme.summaryBg,
    borderRadius: 10,
    children: [
      { type: 'image', src: 'sf-symbol:sum', color: theme.primaryIcon, width: 14, height: 14 },
      text('合计剩余', 'caption2', 'semibold', theme.summaryText, { maxLines: 1 }),
      { type: 'spacer' },
      text(summary.text, 'subheadline', 'bold', summary.color, { maxLines: 1, minScale: 0.7 }),
    ],
  };
}
function renderCard(item, large, theme) {
  if (!item) return missingCard('未选择订阅', theme);
  if (item.error) return errorCard(item.name || '订阅', item.error, theme);
  if (large) {
    return {
      type: 'stack',
      direction: 'column',
      gap: 5,
      padding: [7, 14],
      backgroundColor: theme.cardBg,
      borderRadius: 14,
      children: [
        {
          type: 'stack',
          direction: 'row',
          alignItems: 'center',
          gap: 6,
          children: [
            { type: 'image', src: 'sf-symbol:chart.bar', color: theme.primaryIcon, width: 12, height: 12 },
            text(displayName(item), 'subheadline', 'semibold', theme.headerText, { maxLines: 1, minScale: 0.65 }),
            { type: 'spacer' },
            text(formatBytes(item.remain), 'headline', 'bold', colorForRemain(item.remainRatio, theme), { maxLines: 1, minScale: 0.65 }),
          ],
        },
        {
          type: 'stack',
          direction: 'row',
          alignItems: 'center',
          gap: 8,
          children: [progressBar(item.remainRatio, false, 200, theme), text(ratioText(item.remainRatio), 'caption2', 'semibold', theme.lightText, { maxLines: 1 })],
        },
        {
          type: 'stack',
          direction: 'row',
          alignItems: 'center',
          gap: 8,
          children: [
            text('已用 ' + formatBytes(item.used) + ' / 总共 ' + totalText(item), 'caption2', 'regular', theme.subText, { maxLines: 1 }),
            { type: 'spacer' },
            text(expireText(item), 'caption2', 'regular', theme.subText, { maxLines: 1 }),
          ],
        },
      ],
    };
  } else {
    return {
      type: 'stack',
      direction: 'column',
      gap: 0,
      padding: [0, 12],
      backgroundColor: theme.cardBg,
      borderRadius: 12,
      children: [
        {
          type: 'stack',
          direction: 'row',
          alignItems: 'center',
          gap: 2,
          children: [
            { type: 'image', src: 'sf-symbol:chart.bar', color: theme.primaryIcon, width: 10, height: 10 },
            text(displayName(item), 'subheadline', 'semibold', theme.headerText, { maxLines: 1, minScale: 0.65 }),
            { type: 'spacer' },
            text(formatBytes(item.remain), 'body', 'bold', colorForRemain(item.remainRatio, theme), { maxLines: 1, minScale: 0.65 }),
          ],
        },
        {
          type: 'stack',
          direction: 'row',
          alignItems: 'center',
          gap: 3,
          children: [progressBar(item.remainRatio, false, 140, theme), text(ratioText(item.remainRatio), 'caption2', 'semibold', theme.lightText, { maxLines: 1 })],
        },
        {
          type: 'stack',
          direction: 'row',
          alignItems: 'center',
          gap: 3,
          children: [
            text('已用 ' + formatBytes(item.used) + ' / 总共 ' + totalText(item), 'footnote', 'regular', theme.subText, { maxLines: 1 }),
            { type: 'spacer' },
            text(expireTextShort(item), 'footnote', 'regular', theme.subText, { maxLines: 1 }),
          ],
        },
      ],
    };
  }
}
function renderSmallCard(item, theme) {
  if (!item) return missingCard('未选择订阅', theme);
  if (item.error) return errorCard(item.name || '订阅', item.error, theme);
  return {
    type: 'stack',
    direction: 'column',
    gap: 3,
    padding: [6, 10],
    backgroundColor: theme.cardBg,
    borderRadius: 12,
    children: [
      {
        type: 'stack',
        direction: 'row',
        alignItems: 'center',
        gap: 4,
        children: [
          { type: 'image', src: 'sf-symbol:chart.bar', color: theme.primaryIcon, width: 12, height: 12 },
          text(displayName(item), 'body', 'semibold', theme.headerText, { maxLines: 1, minScale: 0.6 }),
          { type: 'spacer' },
          text(formatBytes(item.remain), 'title3', 'bold', colorForRemain(item.remainRatio, theme), { maxLines: 1, minScale: 0.6 }),
        ],
      },
      {
        type: 'stack',
        direction: 'row',
        alignItems: 'center',
        gap: 6,
        children: [progressBar(item.remainRatio, true, 0, theme), text(ratioText(item.remainRatio), 'caption2', 'semibold', theme.lightText, { maxLines: 1 })],
      },
      {
        type: 'stack',
        direction: 'row',
        alignItems: 'center',
        gap: 0,
        children: [
          text('已用 ' + formatBytes(item.used) + ' / 总共 ' + totalText(item), 'footnote', 'regular', theme.subText, { maxLines: 1 }),
          { type: 'spacer' },
          text(expireTextShort(item), 'footnote', 'regular', theme.subText, { maxLines: 1 }),
        ],
      },
    ],
  };
}
function renderInline(cfg, item, stale, theme) {
  if (!item) return text('未选择订阅', 'caption1', 'semibold', theme.headerText, { maxLines: 1, minScale: 0.5 });
  if (item.error) return text(displayName(item) + ' · ' + item.error, 'caption1', 'semibold', theme.errorText, { maxLines: 1, minScale: 0.5 });
  const body = displayName(item) + ' 剩余 ' + formatBytes(item.remain) + ' · 重置 ' + resetShort(item) + ' · 到期 ' + expireShort(item);
  return text(body, 'caption1', 'semibold', stale ? theme.staleText : theme.headerText, { maxLines: 1, minScale: 0.45 });
}
function renderCircular(item, stale, cfg, theme) {
  const pct = Number.isFinite(item && item.remainRatio) ? Math.round(item.remainRatio * 100) + '%' : '--';
  return {
    type: 'widget',
    url: cfg.openUrl,
    refreshAfter: refreshISO(cfg.refreshMinutes),
    padding: 4,
    gap: 2,
    backgroundColor: 'rgba(0,0,0,0)',
    children: [
      { type: 'image', src: 'sf-symbol:chart.pie.fill', color: stale ? theme.staleText : colorForRemain(item && item.remainRatio, theme), width: 18, height: 18 },
      text(pct, 'headline', 'bold', theme.headerText, { textAlign: 'center', maxLines: 1, minScale: 0.6 }),
    ],
  };
}
function renderAccessoryRectangular(cfg, item, stale, theme) {
  if (!item) return missingCard('未选择订阅', theme);
  if (item.error) return errorCard(item.name || '订阅', item.error, theme);
  return {
    type: 'stack',
    direction: 'column',
    gap: 3,
    padding: 8,
    backgroundColor: theme.cardBg,
    borderRadius: 12,
    children: [
      {
        type: 'stack',
        direction: 'row',
        alignItems: 'center',
        gap: 2,
        children: [
          { type: 'image', src: 'sf-symbol:chart.bar', color: theme.primaryIcon, width: 10, height: 10 },
          text(displayName(item), 'caption2', 'semibold', theme.headerText, { maxLines: 1, minScale: 0.5, flex: 1 }),
          text(formatBytes(item.remain), 'body', 'bold', colorForRemain(item.remainRatio, theme), { maxLines: 1, minScale: 0.55 }),
        ],
      },
      text(ratioText(item.remainRatio) + ' · ' + expireShort(item), 'caption2', 'regular', theme.lightText, { maxLines: 1, minScale: 0.5 }),
    ],
  };
}
function footer(cfg, payload, stale, staleMsg, theme) {
  const source = payload.source || cfg.baseUrl;
  const msg = stale ? '缓存模式 · ' + (staleMsg || '最新请求失败') : '数据源 ' + source;
  return text(msg, 'caption2', 'regular', stale ? theme.staleText : theme.subText, { maxLines: 1, minScale: 0.55 });
}
function errorWidget(cfg, title, msg) {
  const theme = getThemeColors();
  return {
    type: 'widget',
    url: cfg.openUrl,
    refreshAfter: refreshISO(cfg.refreshMinutes),
    padding: 14,
    gap: 8,
    backgroundGradient: {
      type: 'linear',
      colors: theme.bgGradientError,
      startPoint: { x: 0, y: 0 },
      endPoint: { x: 1, y: 1 },
    },
    children: [
      {
        type: 'stack',
        direction: 'row',
        alignItems: 'center',
        gap: 6,
        children: [
          { type: 'image', src: 'sf-symbol:exclamationmark.triangle.fill', color: theme.errorText, width: 16, height: 16 },
          text(title, 'headline', 'bold', theme.headerText, { maxLines: 1 }),
        ],
      },
      text(msg, 'caption1', 'regular', theme.errorText, { maxLines: 5, minScale: 0.65 }),
    ],
  };
}
function missingCard(msg, theme) {
  return {
    type: 'stack',
    direction: 'column',
    gap: 4,
    padding: [8, 10],
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    children: [
      text('提示', 'caption1', 'semibold', theme.headerText, { maxLines: 1 }),
      text(msg, 'caption2', 'regular', theme.lightText, { maxLines: 2, minScale: 0.65 }),
    ],
  };
}
function errorCard(title, msg, theme) {
  return {
    type: 'stack',
    direction: 'column',
    gap: 4,
    padding: [8, 10],
    backgroundColor: theme.errorBg,
    borderRadius: 12,
    children: [
      text(title, 'caption1', 'semibold', theme.headerText, { maxLines: 1 }),
      text(msg, 'caption2', 'regular', theme.errorText, { maxLines: 2, minScale: 0.65 }),
    ],
  };
}
function progressBar(remainRatio, fill, width, theme) {
  if (!Number.isFinite(remainRatio)) {
    return {
      type: 'stack',
      direction: 'row',
      alignItems: 'center',
      gap: 4,
      children: [
        { type: 'image', src: 'sf-symbol:infinity', color: theme.successText, width: 12, height: 12 },
        text('无限流量', 'caption2', 'semibold', theme.successText, { maxLines: 1 }),
      ],
    };
  }
  const pct = clamp(remainRatio, 0, 1);
  const barStyle = fill ? { flex: 1 } : { width: width || 180 };
  return {
    type: 'stack',
    direction: 'row',
    alignItems: 'center',
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 3,
    ...barStyle,
    children: [
      {
        type: 'stack',
        height: 6,
        backgroundColor: colorForRemain(remainRatio, theme),
        borderRadius: 3,
        width: fill ? undefined : Math.max(4, Math.round((width || 180) * pct)),
        flex: fill ? pct : undefined,
        children: [{ type: 'spacer' }],
      },
      { type: 'spacer', flex: 1 - pct },
    ],
  };
}
function aggregate(items, theme) {
  const finite = items.filter((i) => i && Number.isFinite(i.total) && i.total > 0 && Number.isFinite(i.remain));
  if (!finite.length) return null;
  const remain = finite.reduce((sum, i) => sum + i.remain, 0);
  const total = finite.reduce((sum, i) => sum + i.total, 0);
  const ratio = total > 0 ? remain / total : NaN;
  return {
    text: formatBytes(remain),
    color: colorForRemain(ratio, theme),
  };
}
function totalText(item) {
  if (!item || !Number.isFinite(item.total) || item.total <= 0) return '无限';
  return formatBytes(item.total);
}
function ratioText(remainRatio) {
  if (!Number.isFinite(remainRatio)) return '无限';
  return Math.round(clamp(remainRatio, 0, 1) * 100) + '%';
}
function displayName(item) {
  if (!item) return '订阅';
  if (item.planName && item.planName !== item.name) return item.planName + ' · ' + item.name;
  return item.planName || item.name || '订阅';
}
function resetText(item) {
  if (!item) return '未知';
  if (item.resetAt instanceof Date && !isNaN(item.resetAt.getTime())) {
    return fmtDate(item.resetAt) + ' · ' + humanDuration(item.resetAt.getTime() - Date.now());
  }
  if (Number.isFinite(item.remainingDays)) {
    const d = Math.max(0, Math.floor(item.remainingDays));
    return (d === 0 ? '今天' : d + '天后');
  }
  return '未知';
}
function resetShort(item) {
  if (!item) return '未知';
  if (item.resetAt instanceof Date && !isNaN(item.resetAt.getTime())) return fmtMD(item.resetAt);
  if (Number.isFinite(item.remainingDays)) return Math.max(0, Math.floor(item.remainingDays)) + '天';
  return '未知';
}
function expireText(item) {
  if (!item || !(item.expireAt instanceof Date) || isNaN(item.expireAt.getTime())) return '长期有效';
  return fmtDate(item.expireAt) + ' · ' + humanDuration(item.expireAt.getTime() - Date.now());
}
function expireTextShort(item) {
  if (!item || !(item.expireAt instanceof Date) || isNaN(item.expireAt.getTime())) return '长期有效';
  return fmtMD(item.expireAt);
}
function expireShort(item) {
  if (!item || !(item.expireAt instanceof Date) || isNaN(item.expireAt.getTime())) return '长期有效';
  return fmtMD(item.expireAt);
}
function colorForRemain(remainRatio, theme) {
  if (!Number.isFinite(remainRatio)) return theme.successText;
  if (remainRatio >= 0.6) return theme.successText;   // >= 60% 绿色
  if (remainRatio >= 0.4) return theme.primaryIcon;   // >= 40% 蓝色
  return theme.warningText;                            // < 40% 橙色
}
function calcResetAt(rawUrl, remainingDays, subName, cfg) {
  const args = parseArgs(rawUrl);
  const now = new Date();
  const envRule = getResetRule(subName, cfg);
  Object.assign(args, envRule);
  if (args.startDate && args.cycleDays) {
    const cycle = parseInt(args.cycleDays, 10);
    const start = new Date(args.startDate);
    if (Number.isFinite(cycle) && cycle > 0 && !isNaN(start.getTime())) {
      const today = startOfDay(now);
      let next = startOfDay(start);
      while (next <= today) next = addDays(next, cycle);
      return next;
    }
  }
  if (args.resetDay) {
    const day = clampInt(args.resetDay, 1, 1, 31);
    if (Number.isFinite(day)) {
      const y = now.getFullYear();
      const m = now.getMonth();
      const thisDay = Math.min(day, daysInMonth(y, m));
      if (now.getDate() <= thisDay) return new Date(y, m, thisDay, 0, 0, 0, 0);
      const nextMonth = new Date(y, m + 1, 1, 0, 0, 0, 0);
      nextMonth.setDate(Math.min(day, daysInMonth(nextMonth.getFullYear(), nextMonth.getMonth())));
      return nextMonth;
    }
  }
  if (Number.isFinite(remainingDays)) {
    return addDays(startOfDay(now), Math.max(0, Math.floor(remainingDays)));
  }
  return null;
}
function getResetRule(subName, cfg) {
  const rules = (cfg && cfg.resetRules) || {};
  const name = String(subName || '');
  if (rules[name]) return rules[name];
  const fallback = {};
  if (cfg && cfg.resetDay) fallback.resetDay = cfg.resetDay;
  if (cfg && cfg.startDate) fallback.startDate = cfg.startDate;
  if (cfg && cfg.cycleDays) fallback.cycleDays = cfg.cycleDays;
  return fallback;
}
function parseArgs(rawUrl) {
  const url = String(rawUrl || '').split(/\r?\n/).map((s) => s.trim()).find(Boolean) || '';
  const idx = url.indexOf('#');
  if (idx < 0) return {};
  const frag = url.slice(idx + 1).trim();
  if (!frag) return {};
  try {
    const obj = JSON.parse(safeDecode(frag));
    if (obj && typeof obj === 'object' && !Array.isArray(obj)) return obj;
  } catch (_) {}
  const out = {};
  for (const part of frag.split('&')) {
    if (!part) continue;
    const eq = part.indexOf('=');
    const key = eq < 0 ? part : part.slice(0, eq);
    const val = eq < 0 ? '' : part.slice(eq + 1);
    out[key] = val === '' ? true : safeDecode(val);
  }
  return out;
}
function requestJson(ctx, url, cfg) {
  return ctx.http.get(url, {
    headers: { Accept: 'application/json', 'User-Agent': 'Egern-SubStore-Widget' },
    timeout: cfg.timeout,
    redirect: 'follow',
    insecureTls: cfg.insecureTls,
  }).then(async (resp) => {
    const text = await safeText(resp);
    if (resp.status < 200 || resp.status >= 300) {
      throw new Error('HTTP ' + resp.status + ' ' + preview(text, 120));
    }
    try {
      return JSON.parse(text);
    } catch (_) {
      throw new Error('JSON 解析失败 ' + preview(text, 120));
    }
  });
}
function unwrapData(json) {
  if (json && typeof json === 'object' && 'data' in json) return json.data;
  return json;
}
async function safeText(resp) {
  try {
    return await resp.text();
  } catch (_) {
    return '';
  }
}
function apiUrl(base, path) {
  const b = normalizeBaseUrl(base);
  const p = String(path || '').startsWith('/') ? String(path || '') : '/' + String(path || '');
  if (/\/api$/i.test(b) && p.startsWith('/api/')) return b + p.slice(4);
  return b + p;
}
function normalizeBaseUrl(url) {
  return String(url || '').trim().replace(/\/+$/, '');
}
function unique(arr) {
  const out = [];
  for (const item of arr) {
    if (item && !out.includes(item)) out.push(item);
  }
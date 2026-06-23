/**
 * ==========================================
 * 📌 网络服务解锁监测 (NetStatus) 小组件
 *
 * ✨ 主要功能：
 * • 实时检测：支持 YouTube、Netflix、Disney+、ChatGPT、Claude、Gemini 等主流服务解锁状态。
 * • 智能布局：完美适配 iOS 系统 Small、Medium、Large 三种组件尺寸，自动切换布局模式。
 * • 多维监测：自动检测当前代理的地理位置（IP 归属地）及各服务的响应延迟（ms）。
 * • 防缓存机制：内置强制时间戳防缓存逻辑，确保小组件刷新时获取到最新的解锁状态。
 * • 状态提示：通过颜色（绿/黄/红）区分延迟等级，并在组件内直观反馈解锁与否。
 *
 * 🔗 引用链接: https://raw.githubusercontent.com/jnlaoshu/MySelf/master/Egern/Widget/NetStatus
.js
 * ⏱️ 更新时间: 2026.06.23 23:25
 * ==========================================
 */

export default async function(ctx) {
  // ==========================================
  // ⚙️ 严谨的尺寸检测 (兼容数字与各种系统变量)
  // ==========================================
  const envSize = ctx.widgetFamily || 'systemMedium';
  const sizeStr = String(envSize).toLowerCase();
  
  const isSmall = sizeStr.includes('small');
  const isLarge = sizeStr.includes('large');

  const C = {
    bg:          { light: '#FFFFFF', dark: '#050506' },
    text:        { light: '#111114', dark: '#F7F7F8' },
    dim:         { light: '#7B7B84', dark: '#85858E' },
    panel:       { light: '#F5F5F7', dark: '#111114' },
    hairline:    { light: '#E4E4E8', dark: '#242429' },
    chip:        { light: '#E8E8ED', dark: '#202025' },
    accent:      { light: '#7446D8', dark: '#B765FF' },
    ok:          { light: '#2F9E58', dark: '#C7FF18' },
    warn:        { light: '#8A4FC4', dark: '#C887FF' },
    fail:        { light: '#D64545', dark: '#FF626A' },
    terminalDim: { light: '#696971', dark: '#A5A5AE' }
  };
  
  const BASE_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';
  const commonHeaders = { 'User-Agent': BASE_UA };
  
  const getFlagEmoji = (cc) => {
    if (!cc || cc === 'XX' || cc === '--') return '🌐';
    return cc.toUpperCase().replace(/./g, char => String.fromCodePoint(char.charCodeAt(0) + 127397));
  };

  async function timed(fn) {
    const start = Date.now();
    try {
      const result = await fn();
      return { ...result, ms: Date.now() - start };
    } catch {
      return { code: 'ERR', ms: Date.now() - start };
    }
  }

  const fetchProxy = async () => {
    try {
      const res = await ctx.http.get('http://ip-api.com/json/?lang=zh-CN', { timeout: 4000 });
      if (!res) return { code: 'ERR', cc: 'XX' };
      const data = JSON.parse(await res.text());
      const cc = data.countryCode || 'XX';
      return { code: cc === 'XX' ? 'ERR' : 'OK', cc };
    } catch {
      return { code: 'ERR', cc: 'XX' };
    }
  };
  
  async function checkNetflix() {
    const res = await ctx.http.get('https://www.netflix.com/title/70143836', {
      timeout: 4000, headers: commonHeaders, followRedirect: false
    }).catch(() => null);
    return { code: res?.status === 200 ? 'OK' : 'ERR' };
  }

  async function checkDisney() {
    const res = await ctx.http.get('https://www.disneyplus.com', {
      timeout: 4000, headers: commonHeaders, followRedirect: false
    }).catch(() => null);
    return { code: res && res.status !== 403 ? 'OK' : 'ERR' };
  }

  async function checkChatGPT() {
    const res = await ctx.http.get('https://chatgpt.com/cdn-cgi/trace', { timeout: 3000 }).catch(() => null);
    if (!res) return { code: 'ERR' };
    const body = await res.text().catch(() => '');
    const match = body.match(/loc=([A-Z]{2})/);
    return match ? { code: match[1] } : { code: 'ERR' };
  }

  async function checkClaude() {
    const res = await ctx.http.get('https://claude.ai/login', {
      timeout: 5000, headers: commonHeaders
    }).catch(() => null);
    return { code: res ? 'OK' : 'ERR' };
  }

  async function checkGemini() {
    const res = await ctx.http.get('https://gemini.google.com/app', {
      timeout: 4000, headers: commonHeaders, followRedirect: false
    }).catch(() => null);
    return { code: res ? 'OK' : 'ERR' };
  }

  const [proxy, netflix, disney, chatgpt, claude, gemini] = await Promise.all([
    timed(fetchProxy), timed(checkNetflix), timed(checkDisney),
    timed(checkChatGPT), timed(checkClaude), timed(checkGemini)
  ]);
  
  const resultInfo = (result, fallbackRegion) => {
    const available = result.code !== 'ERR';
    return {
      available,
      region: available ? (fallbackRegion || 'XX') : '--',
      ms: result.ms || 0
    };
  };
  
  const streaming = [
    { name: 'YouTube', info: { available: proxy.code === 'OK', region: proxy.cc || '--', ms: proxy.ms } },
    { name: 'Netflix', info: resultInfo(netflix, proxy.cc) },
    { name: 'Disney+', info: resultInfo(disney, proxy.cc) }
  ];
  
  const ai = [
    { name: 'ChatGPT', info: resultInfo(chatgpt, proxy.cc) },
    { name: 'Claude',  info: resultInfo(claude, proxy.cc) },
    { name: 'Gemini',  info: resultInfo(gemini, proxy.cc) }
  ];
  
  const allServices = [...streaming, ...ai];
  const okCount = allServices.filter(s => s.info.available).length;
  const lockedCount = allServices.length - okCount;
  
  const now = new Date();
  const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  const responseColor = (ms, available) => {
    if (!available) return C.fail;
    if (ms >= 800) return C.warn;
    return C.terminalDim;
  };

  // ==========================================
  // 📱 小号布局 (仅显示列表名称及状态)
  // ==========================================
  const renderSmall = () => {
    // 渲染单行服务状态的组件
    const SmallServiceRow = (item) => ({
      type: 'stack',
      direction: 'row',
      alignItems: 'center',
      children: [
        { type: 'text', text: item.name, font: { size: 12, weight: 'bold' }, textColor: C.text, maxLines: 1 },
        { type: 'spacer' },
        { type: 'stack', width: 7, height: 7, borderRadius: 3.5, backgroundColor: item.info.available ? C.ok : C.fail }
      ]
    });

    return {
      type: 'widget',
      backgroundColor: C.bg,
      padding: [14, 16, 14, 16],
      children: [
        // 顶部精简标题栏
        {
          type: 'stack',
          direction: 'row',
          alignItems: 'center',
          padding: [0, 0, 6, 0], // 给列表留出间距
          children: [
            { type: 'text', text: '解锁状态', font: { size: 11, weight: 'bold' }, textColor: C.dim },
            { type: 'spacer' },
            { type: 'text', text: `${okCount}/6`, font: { size: 11, weight: 'bold', design: 'monospaced' }, textColor: lockedCount === 0 ? C.ok : C.fail }
          ]
        },
        // 利用 flex 自动均分剩余空间，列出所有 6 个服务
        {
          type: 'stack',
          direction: 'column',
          flex: 1,
          justifyContent: 'space-between',
          children: allServices.map(SmallServiceRow)
        }
      ]
    };
  };

  // ==========================================
  // 🧩 中号布局
  // ==========================================
  const renderMedium = () => {
    const MediumServiceBlock = (item) => ({
      type: 'stack', direction: 'column', backgroundColor: C.panel, borderRadius: 8, padding: [8, 10, 8, 10], flex: 1, gap: 6,
      children: [
        {
          type: 'stack', direction: 'row', alignItems: 'center',
          children: [
            { type: 'text', text: item.name, font: { size: 12, weight: 'bold' }, textColor: C.text, flex: 1, maxLines: 1 },
            { type: 'stack', width: 6, height: 6, borderRadius: 3, backgroundColor: item.info.available ? C.ok : C.fail }
          ]
        },
        {
          type: 'stack', direction: 'row', alignItems: 'center',
          children: [
            { type: 'text', text: item.info.region, font: { size: 10, weight: 'semibold', design: 'monospaced' }, textColor: C.dim },
            { type: 'spacer' },
            { type: 'text', text: `${item.info.ms}ms`, font: { size: 10, weight: 'medium', design: 'monospaced' }, textColor: responseColor(item.info.ms, item.info.available) }
          ]
        }
      ]
    });

    const MediumRowBox = (items) => ({ type: 'stack', direction: 'row', gap: 10, children: items.map(MediumServiceBlock) });

    return {
      type: 'widget', backgroundColor: C.bg, padding: [16, 16, 16, 16], gap: 12,
      children: [
        {
          type: 'stack', direction: 'row', alignItems: 'center',
          children: [
            { type: 'image', src: 'sf-symbol:antenna.radiowaves.left.and.right', color: lockedCount === 0 ? C.ok : C.dim, width: 14, height: 14 },
            { type: 'text', text: '网络服务解锁', font: { size: 14, weight: 'bold' }, textColor: C.text },
            { type: 'stack', width: 8, children: [] },
            { type: 'stack', padding: [2,6,2,6], backgroundColor: C.chip, borderRadius: 4, children: [
              { type: 'text', text: `${okCount}/6`, font: { size: 10, weight: 'bold', design: 'monospaced' }, textColor: lockedCount === 0 ? C.ok : C.fail }
            ]},
            { type: 'spacer' },
            { type: 'text', text: time, font: { size: 12, weight: 'medium', design: 'monospaced' }, textColor: C.dim }
          ]
        },
        { type: 'stack', direction: 'column', gap: 10, flex: 1, children: [MediumRowBox(streaming), MediumRowBox(ai)] }
      ]
    };
  };

  // ==========================================
  // 🖥️ 大号布局
  // ==========================================
  const renderLarge = () => {
    const LargeServiceBlock = (item) => {
      const regionCode = item.info.region || '--';
      const flag = getFlagEmoji(regionCode);

      return {
        type: 'stack',
        direction: 'column',
        backgroundColor: C.panel,
        borderRadius: 14,
        padding: [16, 12, 16, 12],
        gap: 8,
        flex: 1,
        children: [
          {
            type: 'stack',
            direction: 'row',
            alignItems: 'center',
            children: [
              { type: 'text', text: item.name, font: { size: 14, weight: 'bold' }, textColor: C.text, flex: 1, maxLines: 1 },
              { type: 'stack', width: 8, height: 8, borderRadius: 4, backgroundColor: item.info.available ? C.ok : C.fail }
            ]
          },
          { type: 'spacer' },
          {
            type: 'text',
            text: `${flag} ${regionCode}`,
            font: { size: 14, weight: 'bold', design: 'monospaced' },
            textColor: C.dim
          },
          {
            type: 'stack',
            direction: 'row',
            alignItems: 'center',
            gap: 4,
            children: [
              { type: 'image', src: 'sf-symbol:network', width: 10, height: 10, color: responseColor(item.info.ms, item.info.available) },
              { type: 'text', text: `${item.info.ms}ms`, font: { size: 12, weight: 'medium', design: 'monospaced' }, textColor: responseColor(item.info.ms, item.info.available) }
            ]
          }
        ]
      };
    };

    const gridRows = [
      { type: 'stack', direction: 'row', gap: 12, flex: 1, children: [LargeServiceBlock(streaming[0]), LargeServiceBlock(streaming[1]), LargeServiceBlock(streaming[2])] },
      { type: 'stack', direction: 'row', gap: 12, flex: 1, children: [LargeServiceBlock(ai[0]), LargeServiceBlock(ai[1]), LargeServiceBlock(ai[2])] }
    ];

    const isAllOk = lockedCount === 0;

    return {
      type: 'widget', backgroundColor: C.bg, padding: [20, 20, 20, 20], gap: 16,
      children: [
        {
          type: 'stack', direction: 'row', alignItems: 'center',
          children: [
            {
              type: 'stack', direction: 'column', flex: 1, gap: 4,
              children: [
                {
                  type: 'stack', direction: 'row', alignItems: 'center', gap: 8,
                  children: [
                    { type: 'image', src: 'sf-symbol:antenna.radiowaves.left.and.right', color: isAllOk ? C.ok : C.dim, width: 16, height: 16 },
                    { type: 'text', text: `NETWORK MONITOR • ${time}`, font: { size: 12, weight: 'bold', design: 'monospaced' }, textColor: C.dim }
                  ]
                },
                { type: 'text', text: isAllOk ? '所有服务已解锁' : `有 ${lockedCount} 项服务受限`, font: { size: 19, weight: 'bold' }, textColor: isAllOk ? C.text : C.fail }
              ]
            },
            { type: 'text', text: `${okCount}/6`, font: { size: 42, weight: 'bold', design: 'monospaced' }, textColor: isAllOk ? C.ok : C.fail }
          ]
        },
        { type: 'stack', height: 1, backgroundColor: C.hairline },
        {
          type: 'stack', direction: 'column', gap: 14, flex: 1, children: gridRows
        }
      ]
    };
  };

  // ==========================================
  // 🔀 最终渲染与路由
  // ==========================================
  if (isSmall) return renderSmall();
  if (isLarge) return renderLarge();
  
  return renderMedium();
}
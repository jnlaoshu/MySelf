/**
 * ==========================================================================
 * 📌 网络服务解锁监测 (NetStatus) 小组件
 *
 * ✨ 主要功能：
 * • 实时检测：支持流媒体 (YouTube, Netflix, Disney+, Spotify) 与 AI (ChatGPT, Claude, Gemini, Grok) 8项主流服务。
 * • 智能布局：完美适配 iOS 系统 Small、Medium、Large 三种组件尺寸。
 * • 多维监测：自动检测当前代理的地理位置（IP 归属地）及各服务的响应延迟（ms）。
 * • 防缓存机制：内置强制时间戳防缓存逻辑，确保小组件刷新时获取到最新的解锁状态。
 * • 状态提示：通过颜色（绿/黄/红）区分延迟等级，并在组件内直观反馈解锁与否。
 *
 * 🔗 引用链接: https://raw.githubusercontent.com/jnlaoshu/MySelf/master/Egern/Widget/NetStatus.js
 * ⏱️ 更新时间: 2026.06.25 08:25
 * ==========================================================================
 */

export default async function(ctx) {
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
    ok:          { light: '#2F9E58', dark: '#C7FF18' },
    warn:        { light: '#8A4FC4', dark: '#C887FF' },
    fail:        { light: '#D64545', dark: '#FF626A' },
    terminalDim: { light: '#696971', dark: '#A5A5AE' }
  };
  
  const commonHeaders = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache'
  };
  
  const getFlagEmoji = (cc) => {
    if (!cc || cc === 'XX' || cc === '--') return '🌐';
    return cc.toUpperCase().replace(/./g, char => String.fromCodePoint(char.charCodeAt(0) + 127397));
  };

  const POLICY_REGION = {
    'YouTube': 'HK', 'Netflix': 'SG', 'Disney+': 'SG', 'Spotify': 'US',
    'ChatGPT': 'US', 'Claude':  'US', 'Gemini':  'US', 'Grok':    'US'
  };

  async function timed(fn, timeoutMs = 3000) {
    const start = Date.now();
    try {
      const result = await Promise.race([
        fn(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), timeoutMs))
      ]);
      return { ...result, ms: Date.now() - start };
    } catch {
      return { code: 'ERR', ms: Date.now() - start };
    }
  }

  const fetchProxy = async () => {
    const ts = Date.now();
    const res = await ctx.http.get(`http://ip-api.com/json/?lang=zh-CN&_t=${ts}`, { timeout: 2500 }).catch(() => null);
    if (!res) return { code: 'ERR', cc: 'XX' };
    const data = JSON.parse(await res.text());
    return { code: data.countryCode ? 'OK' : 'ERR', cc: data.countryCode || 'XX' };
  };
  
  async function checkYouTube() { const res = await ctx.http.get(`https://www.youtube.com/generate_204`, { timeout: 3000, headers: commonHeaders }).catch(() => null); return { code: res?.status === 204 ? 'OK' : 'ERR' }; }
  async function checkNetflix() { 
    const res = await ctx.http.get(`https://www.netflix.com/title/81280792`, { timeout: 5000, headers: commonHeaders, followRedirect: true }).catch(() => null);
    return { code: res?.status === 200 ? 'OK' : 'ERR' };
  }
  async function checkDisney() { const res = await ctx.http.get(`https://www.disneyplus.com/`, { timeout: 3000, headers: commonHeaders, followRedirect: false }).catch(() => null); return { code: res && res.status !== 403 ? 'OK' : 'ERR' }; }
  async function checkSpotify() { const res = await ctx.http.get(`https://open.spotify.com/`, { timeout: 3000, headers: commonHeaders, followRedirect: false }).catch(() => null); return { code: res && res.status === 200 ? 'OK' : 'ERR' }; }
  async function checkChatGPT() { const res = await ctx.http.get(`https://chatgpt.com/`, { timeout: 3000, headers: commonHeaders, followRedirect: false }).catch(() => null); return { code: (res && res.status !== 403 && res.status !== 429) ? 'OK' : 'ERR' }; }
  async function checkClaude() { const res = await ctx.http.get(`https://claude.ai/login`, { timeout: 3000, headers: commonHeaders, followRedirect: false }).catch(() => null); return { code: res && res.status === 200 ? 'OK' : 'ERR' }; }
  async function checkGemini() { const res = await ctx.http.get(`https://gemini.google.com/app`, { timeout: 3000, headers: commonHeaders, followRedirect: false }).catch(() => null); return { code: res && res.status === 200 ? 'OK' : 'ERR' }; }
  async function checkGrok() { const res = await ctx.http.get(`https://grok.com/`, { timeout: 3000, headers: commonHeaders, followRedirect: false }).catch(() => null); return { code: res && res.status === 200 ? 'OK' : 'ERR' }; }

  const [proxy, youtube, netflix, disney, spotify, chatgpt, claude, gemini, grok] = await Promise.all([
    timed(fetchProxy), timed(checkYouTube), timed(checkNetflix, 5000), timed(checkDisney),
    timed(checkSpotify), timed(checkChatGPT), timed(checkClaude), timed(checkGemini), timed(checkGrok)
  ]);
  
  const resultInfo = (result, name) => {
    const available = result.code !== 'ERR';
    const finalRegion = POLICY_REGION[name] || proxy.cc || 'XX';
    return { available, region: available ? finalRegion : '--', ms: result.ms || 0 };
  };
  
  const allServices = [
    { name: 'YouTube', info: resultInfo(youtube, 'YouTube') }, { name: 'Netflix', info: resultInfo(netflix, 'Netflix') },
    { name: 'Disney+', info: resultInfo(disney, 'Disney+') }, { name: 'Spotify', info: resultInfo(spotify, 'Spotify') },
    { name: 'ChatGPT', info: resultInfo(chatgpt, 'ChatGPT') }, { name: 'Claude',  info: resultInfo(claude, 'Claude') },
    { name: 'Gemini',  info: resultInfo(gemini, 'Gemini') }, { name: 'Grok',    info: resultInfo(grok, 'Grok') }
  ];
  
  const okCount = allServices.filter(s => s.info.available).length;
  const lockedCount = allServices.length - okCount;
  const time = `${String(new Date().getHours()).padStart(2, '0')}:${String(new Date().getMinutes()).padStart(2, '0')}`;
  const responseColor = (ms, available) => !available ? C.fail : (ms >= 1500 ? C.warn : C.terminalDim);

  const renderHeader = () => ({
    type: 'stack', direction: 'row', alignItems: 'center', children: [
      { type: 'image', src: 'sf-symbol:antenna.radiowaves.left.and.right', color: lockedCount === 0 ? C.ok : C.dim, width: 14, height: 14 },
      { type: 'stack', width: 8 },
      { type: 'text', text: '网络服务解锁', font: { size: 14, weight: 'bold' }, textColor: C.text },
      { type: 'spacer' },
      { type: 'stack', padding: [2, 6, 2, 6], backgroundColor: C.chip, borderRadius: 4, children: [
        { type: 'text', text: `${okCount}/8`, font: { size: 10, weight: 'bold', design: 'monospaced' }, textColor: lockedCount === 0 ? C.ok : C.fail }
      ]},
      { type: 'stack', width: 8 },
      { type: 'text', text: time, font: { size: 12, weight: 'medium', design: 'monospaced' }, textColor: C.dim }
    ]
  });

  const renderSmall = () => {
    return {
      type: 'widget', backgroundColor: C.bg, padding: [10, 14, 10, 14],
      children: [
        { type: 'stack', direction: 'row', alignItems: 'center', padding: [0, 0, 4, 0], children: [
          { type: 'image', src: 'sf-symbol:antenna.radiowaves.left.and.right', color: lockedCount === 0 ? C.ok : C.dim, width: 12, height: 12 },
          { type: 'stack', width: 6 },
          { type: 'text', text: '解锁状态', font: { size: 11, weight: 'bold' }, textColor: C.dim },
          { type: 'spacer' },
          { type: 'stack', padding: [2, 6, 2, 6], backgroundColor: C.chip, borderRadius: 4, children: [
            { type: 'text', text: `${okCount}/8`, font: { size: 10, weight: 'bold', design: 'monospaced' }, textColor: lockedCount === 0 ? C.ok : C.fail }
          ]},
          { type: 'stack', width: 8 },
          { type: 'text', text: time, font: { size: 10, weight: 'medium', design: 'monospaced' }, textColor: C.dim }
        ]},
        { type: 'stack', direction: 'column', flex: 1, justifyContent: 'space-between', gap: 2, children: allServices.map(item => ({
          type: 'stack', direction: 'row', alignItems: 'center', spacing: 6, children: [
            { type: 'stack', width: 5, height: 5, borderRadius: 2.5, backgroundColor: item.info.available ? C.ok : C.fail },
            { type: 'text', text: item.name, font: { size: 11, weight: 'bold' }, textColor: C.text, maxLines: 1 },
            { type: 'spacer' },
            { type: 'text', text: `${getFlagEmoji(item.info.region)} ${item.info.region}`, font: { size: 10, weight: 'bold', design: 'monospaced' }, textColor: C.dim }
          ]
        }))}
      ]
    };
  };

  const renderMedium = () => {
    const MediumServiceBlock = (item) => ({
      type: 'stack', direction: 'column', backgroundColor: C.panel, borderRadius: 8, padding: [8, 6, 8, 6], flex: 1, gap: 5,
      children: [
        { type: 'stack', direction: 'row', alignItems: 'center', children: [
          { type: 'text', text: item.name, font: { size: 11, weight: 'bold' }, textColor: C.text, flex: 1, maxLines: 1 },
          { type: 'stack', width: 5, height: 5, borderRadius: 2.5, backgroundColor: item.info.available ? C.ok : C.fail }
        ]},
        { type: 'stack', direction: 'row', alignItems: 'center', children: [
          { type: 'text', text: item.info.region, font: { size: 10, weight: 'semibold', design: 'monospaced' }, textColor: C.dim },
          { type: 'spacer' },
          { type: 'text', text: `${item.info.ms}ms`, font: { size: 9, weight: 'medium', design: 'monospaced' }, textColor: responseColor(item.info.ms, item.info.available) }
        ]}
      ]
    });
    return {
      type: 'widget', backgroundColor: C.bg, padding: [14, 14, 14, 14], gap: 10,
      children: [
        renderHeader(),
        { type: 'stack', direction: 'column', gap: 8, flex: 1, children: [
          { type: 'stack', direction: 'row', gap: 6, children: allServices.slice(0, 4).map(MediumServiceBlock) },
          { type: 'stack', direction: 'row', gap: 6, children: allServices.slice(4, 8).map(MediumServiceBlock) }
        ]}
      ]
    };
  };

  const renderLarge = () => {
    const LargeServiceBlock = (item) => ({
      type: 'stack', direction: 'column', backgroundColor: C.panel, borderRadius: 12, padding: [12, 14], flex: 1, gap: 6,
      children: [
        { type: 'stack', direction: 'row', alignItems: 'center', children: [
          { type: 'text', text: item.name, font: { size: 13, weight: 'bold' }, textColor: C.text, flex: 1 },
          { type: 'stack', width: 7, height: 7, borderRadius: 3.5, backgroundColor: item.info.available ? C.ok : C.fail }
        ]},
        { type: 'stack', direction: 'row', alignItems: 'center', children: [
          { type: 'text', text: `${getFlagEmoji(item.info.region)} ${item.info.region}`, font: { size: 11, weight: 'bold', design: 'monospaced' }, textColor: C.dim },
          { type: 'spacer' },
          { type: 'text', text: `${item.info.ms}ms`, font: { size: 11, weight: 'medium', design: 'monospaced' }, textColor: responseColor(item.info.ms, item.info.available) }
        ]}
      ]
    });
    const rows = [];
    for (let i = 0; i < 8; i += 2) {
      rows.push({ type: 'stack', direction: 'row', gap: 10, flex: 1, children: [LargeServiceBlock(allServices[i]), LargeServiceBlock(allServices[i+1])] });
    }
    return {
      type: 'widget', backgroundColor: C.bg, padding: [16, 16, 16, 16], gap: 10,
      children: [
        renderHeader(),
        { type: 'stack', direction: 'column', gap: 10, flex: 1, children: rows }
      ]
    };
  };

  if (isSmall) return renderSmall();
  if (isLarge) return renderLarge();
  return renderMedium();
}
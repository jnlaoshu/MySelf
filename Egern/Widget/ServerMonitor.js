/**
 * ==========================================
 * 📌 服务器监控 Widget
 * * ✨ 【主要功能】
 * • 三端尺寸完美适配：
 * - 小号 (Small) ：极简独立色牌，直排四大核心数据，直观且杜绝遮挡，移除顶部多余时间。
 * - 中号 (Medium)：经典双行双列卡片布局，紧凑高效，经典莫兰迪配色。
 * - 大号 (Large) ：沉浸式 2x2 巨幕矩阵，字号与图标大幅扩容，完美填满垂直空间。
 * • 硬件直连监控：通过 SSH 实时获取 CPU、内存、磁盘、网络、温度及负载。
 * • UI 视觉对齐：全局锁定左侧标签宽度，精细化对齐状态图标。
 * • 智能告警色：根据 CPU 负载动态调整运行指标颜色 (绿 → 黄 → 红)。
 * • 多端智能轮播：支持配置最多 5 台服务器进行周期性自动轮播展示。
 * * 🔗 【脚本引用}
 * https://raw.githubusercontent.com/jnlaoshu/MySelf/master/Egern/Widget/ServerMonitor.js
 * * ⏱️ 【更新时间】
 * 2026.03.29 11:00
 * ==========================================
 */

export default async function (ctx) {
  
  // ── 私钥解析与格式化 ──────────────────────────────────────────────────────
  const parsePrivateKey = (key) => {
    if (!key) return "";
    let k = String(key).trim().replace(/\\n/g, '\n').replace(/\\r/g, '').replace(/\r/g, '');
    const headerMatch = k.match(/-----BEGIN [A-Z0-9 ]+-----/);
    const footerMatch = k.match(/-----END [A-Z0-9 ]+-----/);
    if (headerMatch && footerMatch) {
      const header = headerMatch[0];
      const footer = footerMatch[0];
      const headerIdx = k.indexOf(header);
      const footerIdx = k.indexOf(footer);
      if (footerIdx > headerIdx) {
        const body = k.substring(headerIdx + header.length, footerIdx).replace(/\s+/g, '');
        if (!body) throw new Error('私钥解析失败');
        const bodyLines = body.match(/.{1,64}/g)?.join('\n') || body;
        k = `${header}\n${bodyLines}\n${footer}\n`;
      }
    }
    return k;
  };

  // ── 莫兰迪色彩令牌 ────────────────────────────────────────────────────────
  const C = {
    bg:      { light: '#FFFFFF', dark: '#1C1C1E' },
    main:    { light: '#1C1C1E', dark: '#FFFFFF' },
    sub:     { light: '#48484A', dark: '#D1D1D6' },
    muted:   { light: '#8E8E93', dark: '#8E8E93' },
    barBg:   { light: '#E5E5EA', dark: '#38383A' },
    cpu:     { light: '#34C759', dark: '#30D158' },
    mem:     { light: '#007AFF', dark: '#0A84FF' },
    disk:    { light: '#FF9500', dark: '#FF9F0A' },
    net:     { light: '#FF2D55', dark: '#FF375F' },
    temp:    { light: '#FF3B30', dark: '#FF453A' },
    cpuBg:   { light: '#EAF6ED', dark: '#1A291E' },
    memBg:   { light: '#EBF4FA', dark: '#1A2433' },
    dskBg:   { light: '#FDF1E3', dark: '#33261A' },
    netBg:   { light: '#FCEAEF', dark: '#331A20' },
  };

  // ── 服务器配置读取与轮播逻辑 ──────────────────────────────────────────────
  let servers = [];
  for (let i = 1; i <= 5; i++) {
    const h = String(ctx.env[`SSH_SERVER_${i}_HOST`] || "").trim();
    if (!h) continue;
    servers.push({
      name:       String(ctx.env[`SSH_SERVER_${i}_NAME`] || `Server${i}`).trim(),
      host:       h,
      port:       Number(ctx.env[`SSH_SERVER_${i}_PORT`]) || 22,
      username:   String(ctx.env[`SSH_SERVER_${i}_USER`] || "root").trim(),
      password:   ctx.env[`SSH_SERVER_${i}_PWD`] || "",
      privateKey: ctx.env[`SSH_SERVER_${i}_KEY`] || "",
    });
  }

  if (servers.length === 0) {
    servers = [{
      name:       String(ctx.env.SSH_NAME || "Server").trim(),
      host:       String(ctx.env.SSH_HOST || ctx.env.host || "").trim(),
      port:       Number(ctx.env.SSH_PORT || ctx.env.port) || 22,
      username:   String(ctx.env.SSH_USER || ctx.env.username || "root").trim(),
      password:   ctx.env.SSH_PWD || ctx.env.password || "",
      privateKey: ctx.env.SSH_KEY || ctx.env.privateKey || "",
    }];
  }

  const cycleEvery = Math.max(1, Number(ctx.env.SSH_CYCLE_EVERY) || 1);
  let cycleCounter = ctx.storage.getJSON('cycleCounter') || 0;
  cycleCounter = (cycleCounter + 1) % 999999;
  ctx.storage.setJSON('cycleCounter', cycleCounter);

  let currentIndex = ctx.storage.getJSON('multiServerIndex') || 0;
  if (currentIndex >= servers.length) currentIndex = 0;
  let displayIndex = currentIndex;

  if (servers.length > 1 && cycleCounter % cycleEvery === 0) {
    displayIndex = (currentIndex + 1) % servers.length;
    ctx.storage.setJSON('multiServerIndex', displayIndex);
  }

  const server = servers[displayIndex];

  // ── 异常拦截与提示 ────────────────────────────────────────────────────────
  if (!server.host) {
    return {
      type: 'widget', backgroundColor: C.bg, padding: 16, gap: 8,
      children: [
        { type: 'text', text: '⚠️ 监控未配置', font: { size: 14, weight: 'bold' }, textColor: C.main },
        { type: 'text', text: '请在模块参数中填入 SSH 配置', font: { size: 11 }, textColor: C.muted },
      ]
    };
  }

  let thisPrivateKey = "";
  try { thisPrivateKey = parsePrivateKey(server.privateKey); } catch (e) {}

  const fmtBytes = b => {
    if (b >= 1e12) return (b / 1e12).toFixed(1) + 'T';
    if (b >= 1e9)  return (b / 1e9).toFixed(1) + 'G';
    if (b >= 1e6)  return (b / 1e6).toFixed(1) + 'M';
    if (b >= 1e3)  return (b / 1e3).toFixed(0) + 'K';
    return Math.round(b) + 'B';
  };

  // ── SSH 数据获取与状态解析 ────────────────────────────────────────────────
  let d = { host: server.host, hostname: server.name, serverIndex: displayIndex + 1, totalServers: servers.length };
  let session = null;
  const serverKey = server.name.replace(/[^a-zA-Z0-9]/g, '_');

  try {
    session = await ctx.ssh.connect({
      host: server.host, port: server.port, username: server.username,
      ...(thisPrivateKey ? { privateKey: thisPrivateKey } : { password: server.password }),
      timeout: 8000,
    });

    const SEP = '<<SEP>>';
    const cmds = [
      'cat /proc/loadavg', 'cat /proc/uptime', 'head -1 /proc/stat', 'free -b', 'df -B1 / | tail -1', 'nproc',
      "awk '/^ *(eth|en|wlan|ens|eno|bond|veth)/{rx+=$2;tx+=$10}END{print rx,tx}' /proc/net/dev",
      'cat /sys/class/thermal/thermal_zone0/temp 2>/dev/null || cat /sys/class/hwmon/hwmon0/temp1_input 2>/dev/null || echo 0',
    ];

    const { stdout } = await session.exec(cmds.join(` && echo '${SEP}' && `));
    const p = stdout.split(SEP).map(s => s.trim());

    const la = (p[0] || '0 0 0').split(' ');
    d.load = [la[0], la[1], la[2]];

    // 换算服务器运行时间：支持 年/月/日/时/分/秒
    const upSec = parseFloat((p[1] || '0').split(' ')[0]);
    if (!isNaN(upSec) && upSec > 0) {
      const y = Math.floor(upSec / 31536000); // 365天为1年
      let rem = upSec % 31536000;
      const mo = Math.floor(rem / 2592000);   // 30天为1月
      rem = rem % 2592000;
      const d_val = Math.floor(rem / 86400);
      rem = rem % 86400;
      const h = Math.floor(rem / 3600);
      rem = rem % 3600;
      const m_val = Math.floor(rem / 60);
      const s_val = Math.floor(rem % 60);

      let uStr = "";
      if (y > 0) uStr += y + '年';
      if (mo > 0) uStr += mo + '月';
      if (d_val > 0) uStr += d_val + '日';
      if (h > 0) uStr += h + '时';
      if (m_val > 0) uStr += m_val + '分';
      uStr += s_val + '秒';
      
      d.uptimeStr = uStr;
    } else {
      d.uptimeStr = "0秒";
    }

    const cpuNums  = (p[2] || '').replace(/^cpu\s+/, '').split(/\s+/).map(Number);
    const cpuTotal = cpuNums.reduce((a, b) => a + b, 0), cpuIdle = cpuNums[3] || 0;
    const prevCpu  = ctx.storage.getJSON(`_cpu_${serverKey}`);
    let cpuPct = 0;
    if (prevCpu && cpuTotal > prevCpu.t) cpuPct = Math.round(((cpuTotal - prevCpu.t - (cpuIdle - prevCpu.i)) / (cpuTotal - prevCpu.t)) * 100);
    ctx.storage.setJSON(`_cpu_${serverKey}`, { t: cpuTotal, i: cpuIdle });
    d.cpuPct = Math.max(0, Math.min(100, cpuPct));

    const mm = ((p[3] || '').split('\n').find(l => /^Mem:/.test(l)) || '').split(/\s+/);
    d.memTotal = Number(mm[1]) || 1; d.memUsed = Number(mm[2]) || 0; d.memPct = Math.round((d.memUsed / d.memTotal) * 100);

    const df = (p[4] || '').split(/\s+/);
    d.diskTotal = Number(df[1]) || 1; d.diskUsed = Number(df[2]) || 0; d.diskPct = parseInt(df[4]) || 0;
    d.cores = parseInt(p[5]) || 1;

    const nn = (p[6] || '0 0').split(' '), netRx = Number(nn[0]) || 0, netTx = Number(nn[1]) || 0;
    const prevNet = ctx.storage.getJSON(`_net_${serverKey}`), nowTime = Date.now();
    d.rxRate = 0; d.txRate = 0;
    if (prevNet && prevNet.ts) {
      const el = (nowTime - prevNet.ts) / 1000;
      if (el > 0 && el < 3600) { d.rxRate = Math.max(0, (netRx - prevNet.rx) / el); d.txRate = Math.max(0, (netTx - prevNet.tx) / el); }
    }
    ctx.storage.setJSON(`_net_${serverKey}`, { rx: netRx, tx: netTx, ts: nowTime });
    d.netRx = netRx; d.netTx = netTx;

    const tempRaw = parseInt(p[7]) || 0; d.temp = tempRaw > 1000 ? Math.round(tempRaw / 1000) : tempRaw;

  } catch (e) { d.error = String(e.message || e); } finally { if (session) try { await session.close(); } catch (_) {} }

  if (d.error) return { type: 'widget', padding: 16, backgroundColor: C.bg, children: [{ type: 'text', text: `连接失败 [${server.name}]`, font: { size: 14, weight: 'bold' }, textColor: C.temp }, { type: 'spacer', length: 4 }, { type: 'text', text: d.error, font: { size: 10, family: 'Menlo' }, textColor: C.muted }] };

  // ── 动态告警色与通用 UI 组件 ──────────────────────────────────────────────
  const cpuColor = d.cpuPct > 85 ? C.temp : (d.cpuPct > 60 ? C.disk : C.cpu);
  const cpuBgColor = d.cpuPct > 85 ? C.netBg : (d.cpuPct > 60 ? C.dskBg : C.cpuBg);

  const bar = (pct, color, h = 4) => ({
    type: 'stack', direction: 'row', height: h, borderRadius: h / 2, backgroundColor: C.barBg,
    children: pct > 0 ? [{ type: 'stack', flex: Math.max(1, pct), height: h, borderRadius: h / 2, backgroundColor: color, children: [] }, ...(pct < 100 ? [{ type: 'spacer', flex: 100 - pct }] : [])] : [{ type: 'spacer' }],
  });

  const family  = (ctx.widgetFamily || 'systemMedium').toLowerCase();
  const isSmall = family.includes('small');
  const isLarge = family.includes('large');

  // 动态生成的 Header：小号不显示 Uptime；大号放大 Uptime 图标与字号
  const header = () => ({
    type: 'stack', direction: 'row', alignItems: 'center', gap: 0, padding: 0,
    children: [
      { type: 'image', src: 'sf-symbol:server.rack', color: C.main, width: isLarge ? 18 : 14, height: isLarge ? 18 : 14 },
      { type: 'spacer', length: 6 },
      { type: 'text', text: d.hostname, font: { size: isLarge ? 18 : 14, weight: 'heavy' }, textColor: C.main, maxLines: 1 },
      ...(d.totalServers > 1 ? [{ type: 'spacer', length: 6 }, { type: 'text', text: `${d.serverIndex}/${d.totalServers}`, font: { size: isLarge ? 11 : 9, weight: 'bold', family: 'Menlo' }, textColor: C.muted }] : []),
      { type: 'spacer' },
      ...(!isSmall ? [{
        type: 'stack', direction: 'row', alignItems: 'center', gap: isLarge ? 4 : 2, children: [
          { type: 'image', src: 'sf-symbol:clock', color: C.disk, width: isLarge ? 13 : 11, height: isLarge ? 13 : 11 },
          { type: 'text', text: d.uptimeStr, font: { size: isLarge ? 12 : 10, weight: 'bold' }, textColor: C.disk, maxLines: 1 },
        ]
      }] : [])
    ]
  });

  // ── 视图渲染 (小号尺寸) ──────────────────────────────────────────────────
  if (isSmall) {
    const miniCard = (icon, title, value, color, bg) => ({
      type: 'stack', direction: 'row', alignItems: 'center', backgroundColor: bg, borderRadius: 8, padding: [4, 10],
      children: [
        { type: 'stack', direction: 'row', alignItems: 'center', gap: 2, width: 52, children: [
          { type: 'image', src: `sf-symbol:${icon}`, color, width: 13, height: 13 },
          { type: 'text', text: title, font: { size: 12, weight: 'heavy' }, textColor: color }
        ]},
        { type: 'spacer' },
        { type: 'text', text: value, font: { size: 12, weight: 'heavy', family: 'Menlo' }, textColor: color }
      ]
    });

    return {
      type: 'widget', backgroundColor: C.bg, padding: 10, gap: 4,
      children: [
        header(),
        { type: 'spacer', length: 2 },
        miniCard('cpu', 'CPU', `${d.cpuPct}%`, cpuColor, cpuBgColor),
        miniCard('memorychip', 'MEM', `${d.memPct}%`, C.mem, C.memBg),
        miniCard('internaldrive', 'DSK', `${d.diskPct}%`, C.disk, C.dskBg),
        miniCard('network', 'NET', `↓${fmtBytes(d.rxRate)}/s`, C.net, C.netBg),
        { type: 'spacer' }
      ]
    };
  }

  // ── 视图渲染 (大号尺寸 - 扩容优化版) ──────────────────────────────────────
  if (isLarge) {
    const statCardLarge = (icon, title, value, subtext, pct, color, bg) => ({
      type: 'stack', direction: 'column', flex: 1, backgroundColor: bg, borderRadius: 14, padding: [16, 16],
      children: [
        { type: 'stack', direction: 'row', alignItems: 'center', height: 28, gap: 6, children: [
          { type: 'stack', direction: 'row', alignItems: 'center', gap: 4, width: 68, children: [
            { type: 'image', src: `sf-symbol:${icon}`, color, width: 16, height: 16 },
            { type: 'text', text: title, font: { size: 15, weight: 'heavy' }, textColor: color }
          ]},
          { type: 'spacer' },
          { type: 'text', text: value, font: { size: 32, weight: 'heavy', family: 'Menlo' }, textColor: color },
        ]},
        { type: 'spacer' },
        { type: 'stack', direction: 'column', justifyContent: 'flex-start', gap: 10, children: [
          bar(pct, color, 8),
          { type: 'text', text: subtext, font: { size: 13, family: 'Menlo' }, textColor: C.sub, maxLines: 1 },
        ]}
      ]
    });

    const netCardLarge = (bg) => ({
      type: 'stack', direction: 'column', flex: 1, backgroundColor: bg, borderRadius: 14, padding: [16, 16],
      children: [
        { type: 'stack', direction: 'row', alignItems: 'center', height: 28, gap: 6, children: [
          { type: 'stack', direction: 'row', alignItems: 'center', gap: 4, width: 68, children: [
            { type: 'image', src: 'sf-symbol:network', color: C.net, width: 16, height: 16 },
            { type: 'text', text: 'NET', font: { size: 15, weight: 'heavy' }, textColor: C.net }
          ]},
          { type: 'spacer' },
          { type: 'text', text: d.host, font: { size: 13, family: 'Menlo' }, textColor: C.sub, maxLines: 1, minScale: 0.5 },
        ]},
        { type: 'spacer' },
        { type: 'stack', direction: 'column', justifyContent: 'flex-start', gap: 8, children: [
          { type: 'stack', direction: 'row', children: [ 
            { type: 'text', text: `↓${fmtBytes(d.rxRate)}/s`, font: { size: 14, weight: 'bold', family: 'Menlo' }, textColor: C.net }, 
            { type: 'spacer' }, 
            { type: 'text', text: `↑${fmtBytes(d.txRate)}/s`, font: { size: 14, weight: 'bold', family: 'Menlo' }, textColor: C.mem } 
          ]},
          { type: 'stack', direction: 'row', children: [ 
            { type: 'text', text: `↓${fmtBytes(d.netRx)}`, font: { size: 11, family: 'Menlo' }, textColor: C.sub }, 
            { type: 'spacer' }, 
            { type: 'text', text: `↑${fmtBytes(d.netTx)}`, font: { size: 11, family: 'Menlo' }, textColor: C.sub } 
          ]}
        ]}
      ]
    });

    return {
      type: 'widget', backgroundColor: C.bg, padding: 16,
      children: [
        header(),
        { type: 'spacer', length: 12 },
        { type: 'stack', direction: 'column', flex: 1, gap: 12, children: [
          { type: 'stack', direction: 'row', flex: 1, gap: 12, children: [ 
            statCardLarge('cpu', 'CPU', `${d.cpuPct}%`, `${d.cores}C | Ld: ${d.load[0]}`, d.cpuPct, cpuColor, cpuBgColor), 
            statCardLarge('memorychip', 'MEM', `${d.memPct}%`, `${fmtBytes(d.memUsed)} / ${fmtBytes(d.memTotal)}`, d.memPct, C.mem, C.memBg) 
          ]},
          { type: 'stack', direction: 'row', flex: 1, gap: 12, children: [ 
            statCardLarge('internaldrive', 'DSK', `${d.diskPct}%`, `${fmtBytes(d.diskUsed)} / ${fmtBytes(d.diskTotal)}`, d.diskPct, C.disk, C.dskBg), 
            netCardLarge(C.netBg) 
          ]}
        ]}
      ]
    };
  }

  // ── 视图渲染 (中号尺寸 - 原版锁定不变) ───────────────────────────────────
  const statCard = (icon, title, value, subtext, pct, color, bg) => ({
    type: 'stack', direction: 'column', flex: 1, backgroundColor: bg, borderRadius: 8, padding: [8, 12],
    children: [
      { type: 'stack', direction: 'row', alignItems: 'center', height: 16, gap: 4, children: [
        { type: 'stack', direction: 'row', alignItems: 'center', gap: 2, width: 52, children: [
          { type: 'image', src: `sf-symbol:${icon}`, color, width: 13, height: 13 },
          { type: 'text', text: title, font: { size: 12, weight: 'heavy' }, textColor: color }
        ]},
        { type: 'spacer' },
        { type: 'text', text: value, font: { size: 13, weight: 'heavy', family: 'Menlo' }, textColor: color },
      ]},
      { type: 'spacer' },
      { type: 'stack', direction: 'column', height: 24, justifyContent: 'flex-start', gap: 4, children: [
        bar(pct, color),
        // 磁盘卡片特定字号微调：仅针对 DSK 卡片，副标题中不带小数的数值和“/”符号切换为系统字体，收缩 1px 宽度。
        title === 'DSK'
          ? mkRow([ mkText(`${fmtBytes(d.diskUsed)}`, 9, "bold", C.sub, { family: "Menlo" }), mkText(` / `, 9, "bold", C.sub, { weight: "regular" }), mkText(`${fmtBytes(d.diskTotal)}`, 9, "bold", C.sub, { weight: "regular" }) ], 0, { alignment: "start" })
          : mkText(subtext, 9, "bold", C.sub, { family: "Menlo", maxLines: 1 })
      ]}
    ]
  });

  const netCard = (bg) => ({
    type: 'stack', direction: 'column', flex: 1, backgroundColor: bg, borderRadius: 8, padding: [8, 12],
    children: [
      { type: 'stack', direction: 'row', alignItems: 'center', height: 16, gap: 4, children: [
        { type: 'stack', direction: 'row', alignItems: 'center', gap: 2, width: 52, children: [
          { type: 'image', src: 'sf-symbol:network', color: C.net, width: 13, height: 13 },
          { type: 'text', text: 'NET', font: { size: 12, weight: 'heavy' }, textColor: C.net }
        ]},
        { type: 'spacer' },
        { type: 'text', text: d.host, font: { size: 9, family: 'Menlo' }, textColor: C.sub, maxLines: 1, minScale: 0.5 },
      ]},
      { type: 'spacer' },
      { type: 'stack', direction: 'column', height: 24, justifyContent: 'flex-start', gap: 1, children: [
        { type: 'stack', direction: 'row', children: [ { type: 'text', text: `↓${fmtBytes(d.rxRate)}/s`, font: { size: 9, weight: 'bold', family: 'Menlo' }, textColor: C.net }, { type: 'spacer' }, { type: 'text', text: `↑${fmtBytes(d.txRate)}/s`, font: { size: 9, weight: 'bold', family: 'Menlo' }, textColor: C.mem } ]},
        { type: 'stack', direction: 'row', children: [ { type: 'text', text: `↓${fmtBytes(d.netRx)}`, font: { size: 8, family: 'Menlo' }, textColor: C.sub }, { type: 'spacer' }, { type: 'text', text: `↑${fmtBytes(d.netTx)}`, font: { size: 8, family: 'Menlo' }, textColor: C.sub } ]}
      ]}
    ]
  });

  return {
    type: 'widget', backgroundColor: C.bg, padding: [10, 14, 12, 14],
    children: [
      header(), { type: 'spacer', length: 6 },
      { type: 'stack', direction: 'row', flex: 1, gap: 4, children: [ 
        statCard('cpu', 'CPU', `${d.cpuPct}%`, `${d.cores}C | Ld: ${d.load[0]}`, d.cpuPct, C.cpu, C.cpuBg), 
        statCard('memorychip', 'MEM', `${d.memPct}%`, `${fmtBytes(d.memUsed)} / ${fmtBytes(d.memTotal)}`, d.memPct, C.mem, C.memBg) 
      ]},
      { type: 'spacer', length: 4 },
      { type: 'stack', direction: 'row', flex: 1, gap: 4, children: [ 
        statCard('internaldrive', 'DSK', `${d.diskPct}%`, `${fmtBytes(d.diskUsed)} / ${fmtBytes(d.diskTotal)}`, d.diskPct, C.disk, C.dskBg), 
        netCard(C.netBg) 
      ]}
    ]
  };
}
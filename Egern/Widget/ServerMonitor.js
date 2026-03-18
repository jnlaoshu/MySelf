/**
 * ==========================================
 * 📌 代码名称: 🖥️ 服务器监控 (Server Monitor)
 * ✨ 主要功能: 基于 Egern 原生 SSH 引擎的满血监控面板。深度重构 UI 渲染底层，全局原生支持 iOS 深浅色自适应主题；采用流式图表与动态预警色实时呈现 CPU、内存、磁盘及网络核心负载；内置防断连容错机制，打造极致统一的桌面极客美学。
 * 🔗 引用链接: https://raw.githubusercontent.com/jnlaoshu/MySelf/master/Egern/Widget/ServerMonitor.js
 * ⏱️ 更新时间: 2026.03.18 22:55
 * ==========================================
 */

export default async function (ctx) {
  // --- 变量兼容补丁 (保障与主配置 YAML 命名规范绝对统一) ---
  if (ctx.env) {
    ctx.env.host = ctx.env.SSH_HOST || ctx.env.host || "";
    ctx.env.username = ctx.env.SSH_USER || ctx.env.username || "root";
    ctx.env.password = ctx.env.SSH_PWD || ctx.env.password || "";
    ctx.env.privateKey = ctx.env.SSH_KEY || ctx.env.privateKey || "";
    ctx.env.port = ctx.env.SSH_PORT || ctx.env.port || 22;
  }
  const customName = (ctx.env.SSH_NAME || "").trim();

  // ─── Helpers ────────────────────────────────
  const fmtBytes = b => {
    if (b >= 1e12) return (b / 1e12).toFixed(1) + 'T';
    if (b >= 1e9)  return (b / 1e9).toFixed(1) + 'G';
    if (b >= 1e6)  return (b / 1e6).toFixed(1) + 'M';
    if (b >= 1e3)  return (b / 1e3).toFixed(0) + 'K';
    return Math.round(b) + 'B';
  };

  // ─── Fetch Data via SSH ─────────────────────
  let d;
  try {
    const { host, username, password, privateKey, port } = ctx.env;
    const session = await ctx.ssh.connect({
      host, port: Number(port || 22), username,
      ...(privateKey ? { privateKey } : { password }),
      timeout: 8000,
    });

    const SEP = '<<SEP>>';
    const cmds = [
      'hostname -s 2>/dev/null || hostname',                                                       
      'cat /proc/loadavg',                                                                         
      'uptime -p 2>/dev/null || uptime',                                                           
      'head -1 /proc/stat',                                                                        
      'free -b',                                                                                   
      'df -B1 / | tail -1',                                                                        
      'nproc',                                                                                     
      'uname -r',                                                                                  
      "awk '/^ *(eth|en|wlan|ens|eno|bond|veth)/{rx+=$2;tx+=$10}END{print rx,tx}' /proc/net/dev",  
      'cat /sys/class/thermal/thermal_zone0/temp 2>/dev/null || cat /sys/class/hwmon/hwmon0/temp1_input 2>/dev/null || echo 0', 
      "awk '$3~/^(sd[a-z]|vd[a-z]|nvme[0-9]+n[0-9]+|mmcblk[0-9]+)$/{r+=$6;w+=$10}END{print r*512,w*512}' /proc/diskstats 2>/dev/null || echo '0 0'", 
      "ls /proc 2>/dev/null | grep -c '^[0-9]' || echo 0",                                        
    ];
    const { stdout } = await session.exec(cmds.join(` && echo '${SEP}' && `));
    await session.close();

    const p = stdout.split(SEP).map(s => s.trim());
    const hostname = customName || p[0] || 'server';
    const la = (p[1] || '0 0 0').split(' ');
    const load = [la[0], la[1], la[2]];
    const uptime = (p[2] || '').replace(/^up\s+/, '').replace(/,\s*$/, '');

    // CPU
    const cpuNums = (p[3] || '').replace(/^cpu\s+/, '').split(/\s+/).map(Number);
    const cpuTotal = cpuNums.reduce((a, b) => a + b, 0);
    const cpuIdle = cpuNums[3] || 0;
    const prevCpu = ctx.storage.getJSON('_cpu');
    let cpuPct = 0;
    if (prevCpu && cpuTotal > prevCpu.t) {
      cpuPct = Math.round(((cpuTotal - prevCpu.t - (cpuIdle - prevCpu.i)) / (cpuTotal - prevCpu.t)) * 100);
    }
    ctx.storage.setJSON('_cpu', { t: cpuTotal, i: cpuIdle });
    cpuPct = Math.max(0, Math.min(100, cpuPct));
    const cpuHist = ctx.storage.getJSON('_cpuH') || [];
    cpuHist.push(cpuPct);
    while (cpuHist.length > 20) cpuHist.shift();
    ctx.storage.setJSON('_cpuH', cpuHist);

    // Memory
    const memLine = (p[4] || '').split('\n').find(l => /^Mem:/.test(l)) || '';
    const swapLine = (p[4] || '').split('\n').find(l => /^Swap:/.test(l)) || '';
    const mm = memLine.split(/\s+/), sm = swapLine.split(/\s+/);
    const memTotal = Number(mm[1]) || 1, memUsed = Number(mm[2]) || 0;
    const memPct = Math.round((memUsed / memTotal) * 100);
    const swapTotal = Number(sm[1]) || 0, swapUsed = Number(sm[2]) || 0;
    const swapPct = swapTotal > 0 ? Math.round((swapUsed / swapTotal) * 100) : 0;
    const memHist = ctx.storage.getJSON('_memH') || [];
    memHist.push(memPct);
    while (memHist.length > 20) memHist.shift();
    ctx.storage.setJSON('_memH', memHist);

    // Disk
    const df = (p[5] || '').split(/\s+/);
    const diskTotal = Number(df[1]) || 1, diskUsed = Number(df[2]) || 0;
    const diskPct = parseInt(df[4]) || 0;
    const cores = parseInt(p[6]) || 1;
    const kernel = (p[7] || '').split('-')[0];

    // Network
    const nn = (p[8] || '0 0').split(' ');
    const netRx = Number(nn[0]) || 0, netTx = Number(nn[1]) || 0;
    const prevNet = ctx.storage.getJSON('_net');
    const now = Date.now();
    let rxRate = 0, txRate = 0;
    if (prevNet && prevNet.ts) {
      const el = (now - prevNet.ts) / 1000;
      if (el > 0 && el < 3600) {
        rxRate = Math.max(0, (netRx - prevNet.rx) / el);
        txRate = Math.max(0, (netTx - prevNet.tx) / el);
      }
    }
    ctx.storage.setJSON('_net', { rx: netRx, tx: netTx, ts: now });

    // Temperature
    const tempRaw = parseInt(p[9]) || 0;
    const temp = tempRaw > 1000 ? Math.round(tempRaw / 1000) : tempRaw;

    // Disk I/O
    const dio = (p[10] || '0 0').split(' ');
    const drt = Number(dio[0]) || 0, dwt = Number(dio[1]) || 0;
    const prevDsk = ctx.storage.getJSON('_dsk');
    let diskRd = 0, diskWr = 0;
    if (prevDsk && prevDsk.ts) {
      const el = (now - prevDsk.ts) / 1000;
      if (el > 0 && el < 3600) {
        diskRd = Math.max(0, (drt - prevDsk.r) / el);
        diskWr = Math.max(0, (dwt - prevDsk.w) / el);
      }
    }
    ctx.storage.setJSON('_dsk', { r: drt, w: dwt, ts: now });

    const procs = parseInt(p[11]) || 0;

    d = {
      hostname, load, uptime, cpuPct, cpuHist, cores, kernel,
      memTotal, memUsed, memPct, memHist, swapTotal, swapUsed, swapPct,
      diskTotal, diskUsed, diskPct, diskRd, diskWr,
      rxRate, txRate, netRx, netTx, temp, procs,
    };
  } catch (e) {
    d = { error: String(e.message || e) };
  }

  // ─── Theme (深度重构的深浅色引擎与苹果原生预警色) ──────────────────
  const C = {
    bg: [{ light: '#FFFFFF', dark: '#1C1C1E' }, { light: '#F5F5F9', dark: '#0C0C0E' }],
    barBg: { light: '#E5E5EA', dark: '#38383A' },
    text: { light: '#1C1C1E', dark: '#FFFFFF' },
    muted: { light: '#8E8E93', dark: '#8E8E93' },
    dim: { light: '#C7C7CC', dark: '#48484A' },
    cpu: { light: '#34C759', dark: '#30D158' },
    mem: { light: '#007AFF', dark: '#0A84FF' },
    swap: { light: '#AF52DE', dark: '#BF5AF2' },
    net: { light: '#FF2D55', dark: '#FF375F' },
    disk: { light: '#FF9500', dark: '#FF9F0A' },
    temp: { light: '#FF3B30', dark: '#FF453A' },
  };

  const pctColor = (pct, lo, hi) => pct >= hi ? C.temp : pct >= lo ? C.disk : C.cpu;

  const bgGradient = {
    type: 'linear', colors: C.bg,
    startPoint: { x: 0, y: 0 }, endPoint: { x: 1, y: 1 },
  };

  // ─── Reusable Components ────────────────────
  const bar = (pct, color, h = 6) => ({
    type: 'stack', direction: 'row', height: h, borderRadius: h / 2,
    backgroundColor: C.barBg,
    children: pct > 0
      ? [
          { type: 'stack', flex: Math.max(1, pct), height: h, borderRadius: h / 2, backgroundColor: color, children: [] },
          ...(pct < 100 ? [{ type: 'spacer', flex: 100 - pct }] : []),
        ]
      : [{ type: 'spacer' }],
  });

  const spark = (data, color, h = 20) => {
    if (!data || data.length === 0) return { type: 'spacer', length: h };
    const mx = Math.max(...data, 1);
    return {
      type: 'stack', direction: 'row', alignItems: 'end', height: h, gap: 1,
      children: data.map(v => {
        const r = v / mx;
        return {
          type: 'stack', flex: 1, borderRadius: 1, children: [],
          backgroundColor: color,
          opacity: 0.3 + 0.7 * r,
          height: Math.max(1, Math.round(r * h)),
        };
      }),
    };
  };

  const metric = (icon, label, pct, val, color) => ({
    type: 'stack', direction: 'column', gap: 3,
    children: [
      { type: 'stack', direction: 'row', alignItems: 'center', gap: 4, children: [
        { type: 'image', src: `sf-symbol:${icon}`, color, width: 11, height: 11 },
        { type: 'text', text: label, font: { size: 'caption1', weight: 'semibold' }, textColor: C.text },
        { type: 'spacer' },
        { type: 'text', text: val, font: { size: 11, weight: 'medium', family: 'Menlo' }, textColor: color },
      ]},
      bar(pct, color),
    ],
  });

  const divider = {
    type: 'stack', height: 0.5, backgroundColor: C.barBg, children: [{ type: 'spacer' }],
  };

  const header = (iconSize) => ({
    type: 'stack', direction: 'row', alignItems: 'center', gap: 6, children: [
      { type: 'image', src: 'sf-symbol:server.rack', color: C.cpu, width: iconSize, height: iconSize },
      { type: 'text', text: d.hostname, font: { size: 15, weight: 'heavy' }, textColor: C.text, maxLines: 1 },
      { type: 'spacer' },
      ...(d.temp > 0 ? [
        { type: 'image', src: 'sf-symbol:thermometer.medium', color: pctColor(d.temp, 60, 80), width: 11, height: 11 },
        { type: 'text', text: `${d.temp}°C`, font: { size: 11, family: 'Menlo' }, textColor: pctColor(d.temp, 60, 80) },
      ] : []),
      { type: 'text', text: d.uptime, font: { size: 'caption2', weight: 'medium' }, textColor: C.muted, maxLines: 1, minScale: 0.7 },
    ],
  });

  const footer = {
    type: 'stack', direction: 'row', alignItems: 'center', children: [
      { type: 'date', date: new Date().toISOString(), format: 'relative', font: { size: 'caption2' }, textColor: C.dim },
      { type: 'spacer' },
      { type: 'text', text: `${d.procs} processes`, font: { size: 'caption2' }, textColor: C.dim },
    ],
  };

  // ─── Error Handling ──────────────────────────────────
  if (d.error) {
    return {
      type: 'widget', padding: 16, gap: 8, backgroundGradient: bgGradient,
      children: [
        { type: 'stack', direction: 'row', alignItems: 'center', gap: 8, children: [
          { type: 'image', src: 'sf-symbol:exclamationmark.triangle.fill', color: C.temp, width: 20, height: 20 },
          { type: 'text', text: 'Connection Failed', font: { size: 'headline', weight: 'bold' }, textColor: C.text },
        ]},
        { type: 'text', text: d.error, font: { size: 'caption1' }, textColor: C.muted, maxLines: 3 },
      ],
    };
  }

  // ─── Widget Render Logic ────────────────────────────
  if (ctx.widgetFamily === 'accessoryInline') {
    return {
      type: 'widget',
      children: [{ type: 'text', text: `${d.hostname}  CPU ${d.cpuPct}%  MEM ${d.memPct}%` }],
    };
  }

  if (ctx.widgetFamily === 'accessoryCircular') {
    return {
      type: 'widget', padding: 4,
      children: [
        { type: 'spacer' },
        { type: 'text', text: `${d.cpuPct}%`, font: { size: 'title2', weight: 'bold' }, textAlign: 'center' },
        { type: 'text', text: 'CPU', font: { size: 'caption2', weight: 'medium' }, textAlign: 'center', opacity: 0.7 },
        { type: 'spacer' },
      ],
    };
  }

  if (ctx.widgetFamily === 'accessoryRectangular') {
    return {
      type: 'widget', gap: 2,
      children: [
        { type: 'stack', direction: 'row', alignItems: 'center', gap: 4, children: [
          { type: 'image', src: 'sf-symbol:server.rack', width: 11, height: 11 },
          { type: 'text', text: d.hostname, font: { size: 'headline', weight: 'bold' }, maxLines: 1 },
        ]},
        { type: 'text', text: `CPU ${d.cpuPct}%  MEM ${d.memPct}%  DSK ${d.diskPct}%`, font: { size: 11, family: 'Menlo' } },
        { type: 'text', text: `↓${fmtBytes(d.rxRate)}/s  ↑${fmtBytes(d.txRate)}/s`, font: { size: 11, family: 'Menlo' }, opacity: 0.7 },
      ],
    };
  }

  if (ctx.widgetFamily === 'systemSmall') {
    return {
      type: 'widget', backgroundGradient: bgGradient, padding: 12, gap: 6,
      children: [
        { type: 'stack', direction: 'row', alignItems: 'center', gap: 6, children: [
          { type: 'image', src: 'sf-symbol:server.rack', color: C.cpu, width: 13, height: 13 },
          { type: 'text', text: d.hostname, font: { size: 15, weight: 'heavy' }, textColor: C.text, maxLines: 1, minScale: 0.8 },
          { type: 'spacer' },
          ...(d.temp > 0 ? [{ type: 'text', text: `${d.temp}°`, font: { size: 11, family: 'Menlo' }, textColor: pctColor(d.temp, 60, 80) }] : []),
        ]},
        spark(d.cpuHist, C.cpu, 20),
        metric('cpu', 'CPU', d.cpuPct, `${d.cpuPct}%`, pctColor(d.cpuPct, 60, 85)),
        metric('memorychip', 'MEM', d.memPct, `${d.memPct}%`, pctColor(d.memPct, 60, 85)),
        metric('internaldrive', 'DSK', d.diskPct, `${d.diskPct}%`, pctColor(d.diskPct, 70, 90)),
      ],
    };
  }

  if (ctx.widgetFamily === 'systemMedium') {
    return {
      type: 'widget', backgroundGradient: bgGradient, padding: 14,
      children: [
        header(14),
        { type: 'spacer' },
        { type: 'stack', direction: 'column', gap: 6, children: [
          { type: 'stack', direction: 'column', gap: 2, children: [
            { type: 'stack', direction: 'row', alignItems: 'center', gap: 4, children: [
              { type: 'image', src: 'sf-symbol:cpu', color: C.cpu, width: 11, height: 11 },
              { type: 'text', text: `CPU ${d.cores}C`, font: { size: 'caption1', weight: 'semibold' }, textColor: C.text },
              { type: 'text', text: `${d.cpuPct}%`, font: { size: 'caption1', weight: 'bold', family: 'Menlo' }, textColor: pctColor(d.cpuPct, 60, 85) },
              { type: 'spacer' },
              { type: 'text', text: `Load ${d.load.join(' ')}`, font: { size: 10, family: 'Menlo' }, textColor: C.dim },
            ]},
            bar(d.cpuPct, pctColor(d.cpuPct, 60, 85), 4),
          ]},
          { type: 'stack', direction: 'column', gap: 2, children: [
            { type: 'stack', direction: 'row', alignItems: 'center', gap: 4, children: [
              { type: 'image', src: 'sf-symbol:memorychip', color: C.mem, width: 11, height: 11 },
              { type: 'text', text: 'MEM', font: { size: 'caption1', weight: 'semibold' }, textColor: C.text },
              { type: 'text', text: `${d.memPct}%`, font: { size: 'caption1', weight: 'bold', family: 'Menlo' }, textColor: pctColor(d.memPct, 60, 85) },
              { type: 'spacer' },
              { type: 'text', text: `${fmtBytes(d.memUsed)} / ${fmtBytes(d.memTotal)}`, font: { size: 10, family: 'Menlo' }, textColor: C.dim },
            ]},
            bar(d.memPct, pctColor(d.memPct, 60, 85), 4),
          ]},
          { type: 'stack', direction: 'column', gap: 2, children: [
            { type: 'stack', direction: 'row', alignItems: 'center', gap: 4, children: [
              { type: 'image', src: 'sf-symbol:internaldrive', color: C.disk, width: 11, height: 11 },
              { type: 'text', text: 'DSK', font: { size: 'caption1', weight: 'semibold' }, textColor: C.text },
              { type: 'text', text: `${d.diskPct}%`, font: { size: 'caption1', weight: 'bold', family: 'Menlo' }, textColor: pctColor(d.diskPct, 70, 90) },
              { type: 'spacer' },
              { type: 'text', text: `${fmtBytes(d.diskUsed)} / ${fmtBytes(d.diskTotal)}`, font: { size: 10, family: 'Menlo' }, textColor: C.dim },
            ]},
            bar(d.diskPct, pctColor(d.diskPct, 70, 90), 4),
          ]},
          { type: 'stack', direction: 'row', alignItems: 'center', gap: 4, children: [
            { type: 'image', src: 'sf-symbol:network', color: C.net, width: 11, height: 11 },
            { type: 'text', text: 'NET', font: { size: 'caption1', weight: 'semibold' }, textColor: C.text },
            { type: 'text', text: `↓${fmtBytes(d.rxRate)}/s`, font: { size: 11, family: 'Menlo', weight: 'medium' }, textColor: C.net },
            { type: 'text', text: `↑${fmtBytes(d.txRate)}/s`, font: { size: 11, family: 'Menlo', weight: 'medium' }, textColor: C.swap },
            { type: 'spacer' },
            { type: 'text', text: `↓${fmtBytes(d.netRx)}`, font: { size: 10, family: 'Menlo' }, textColor: C.dim },
            { type: 'text', text: `↑${fmtBytes(d.netTx)}`, font: { size: 10, family: 'Menlo' }, textColor: C.dim },
          ]},
        ]},
        { type: 'spacer' },
        footer,
      ],
    };
  }

  return {
    type: 'widget', backgroundGradient: bgGradient, padding: [12, 14], gap: 6,
    children: [
      header(16),
      divider,
      { type: 'spacer' },
      { type: 'stack', direction: 'row', alignItems: 'center', gap: 4, children: [
        { type: 'image', src: 'sf-symbol:cpu', color: C.cpu, width: 13, height: 13 },
        { type: 'text', text: `CPU ${d.cores}C`, font: { size: 'caption1', weight: 'bold' }, textColor: C.text },
        { type: 'text', text: `${d.cpuPct}%`, font: { size: 'caption1', weight: 'bold', family: 'Menlo' }, textColor: pctColor(d.cpuPct, 60, 85) },
        { type: 'spacer' },
        { type: 'text', text: `Load ${d.load.join(' ')}`, font: { size: 10, family: 'Menlo' }, textColor: C.dim },
      ]},
      spark(d.cpuHist, pctColor(d.cpuPct, 60, 85), 28),
      bar(d.cpuPct, pctColor(d.cpuPct, 60, 85), 6),
      divider,
      { type: 'spacer' },
      { type: 'stack', direction: 'row', alignItems: 'center', gap: 4, children: [
        { type: 'image', src: 'sf-symbol:memorychip', color: C.mem, width: 13, height: 13 },
        { type: 'text', text: 'MEM', font: { size: 'caption1', weight: 'bold' }, textColor: C.text },
        { type: 'text', text: `${d.memPct}%`, font: { size: 'caption1', weight: 'bold', family: 'Menlo' }, textColor: pctColor(d.memPct, 60, 85) },
        { type: 'spacer' },
        { type: 'text', text: `${fmtBytes(d.memUsed)} / ${fmtBytes(d.memTotal)}`, font: { size: 10, family: 'Menlo' }, textColor: C.dim },
      ]},
      spark(d.memHist, C.mem, 24),
      bar(d.memPct, pctColor(d.memPct, 60, 85), 6),
      ...(d.swapTotal > 0 ? [
        { type: 'stack', direction: 'row', alignItems: 'center', children: [
          { type: 'text', text: `Swap ${d.swapPct}%`, font: { size: 10, family: 'Menlo' }, textColor: C.swap },
          { type: 'spacer' },
          { type: 'text', text: `${fmtBytes(d.swapUsed)} / ${fmtBytes(d.swapTotal)}`, font: { size: 10, family: 'Menlo' }, textColor: C.dim },
        ]},
        bar(d.swapPct, C.swap, 4),
      ] : []),
      divider,
      { type: 'spacer' },
      { type: 'stack', direction: 'row', alignItems: 'center', gap: 4, children: [
        { type: 'image', src: 'sf-symbol:internaldrive', color: C.disk, width: 13, height: 13 },
        { type: 'text', text: 'Disk', font: { size: 'caption1', weight: 'bold' }, textColor: C.text },
        { type: 'text', text: `${d.diskPct}%`, font: { size: 'caption1', weight: 'bold', family: 'Menlo' }, textColor: pctColor(d.diskPct, 70, 90) },
        { type: 'spacer' },
        { type: 'text', text: `${fmtBytes(d.diskUsed)} / ${fmtBytes(d.diskTotal)}`, font: { size: 10, family: 'Menlo' }, textColor: C.dim },
      ]},
      bar(d.diskPct, pctColor(d.diskPct, 70, 90), 6),
      { type: 'stack', direction: 'row', children: [
        { type: 'text', text: `R ${fmtBytes(d.diskRd)}/s`, font: { size: 10, family: 'Menlo' }, textColor: C.disk },
        { type: 'spacer' },
        { type: 'text', text: `W ${fmtBytes(d.diskWr)}/s`, font: { size: 10, family: 'Menlo' }, textColor: C.disk },
      ]},
      divider,
      { type: 'spacer' },
      { type: 'stack', direction: 'row', alignItems: 'center', gap: 4, children: [
        { type: 'image', src: 'sf-symbol:network', color: C.net, width: 13, height: 13 },
        { type: 'text', text: 'Network', font: { size: 'caption1', weight: 'bold' }, textColor: C.text },
        { type: 'spacer' },
        { type: 'text', text: `↓${fmtBytes(d.rxRate)}/s`, font: { size: 11, family: 'Menlo', weight: 'medium' }, textColor: C.net },
        { type: 'text', text: `↑${fmtBytes(d.txRate)}/s`, font: { size: 11, family: 'Menlo', weight: 'medium' }, textColor: C.swap },
      ]},
      { type: 'stack', direction: 'row', children: [
        { type: 'text', text: `Total ↓${fmtBytes(d.netRx)}`, font: { size: 10, family: 'Menlo' }, textColor: C.dim },
        { type: 'spacer' },
        { type: 'text', text: `Total ↑${fmtBytes(d.netTx)}`, font: { size: 10, family: 'Menlo' }, textColor: C.dim },
      ]},
      divider,
      footer,
    ],
  };
}

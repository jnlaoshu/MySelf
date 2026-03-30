/**
 * ==========================================
 * 📌 服务器监控 (Server Monitor) 小组件
 * ✨ 【主要功能】
 * • 三端完美适配：Small（6列直排）、Medium（经典2×2）、Large（2×2巨幕统一风格）
 * • 硬件直连 SSH 实时监控：CPU / 内存 / 磁盘 / 网络 / 温度 / 负载 / Docker / GPU（NVIDIA）
 * • GPU监控：利用率% + 显存占用% + GPU温度（nvidia-smi）
 * • 智能动态颜色：CPU + 温度 + GPU 独立告警色（绿→黄→红）
 * • 完整负载 1/5/15 + 最后更新时间 + 多服务器轮播（支持强制关闭）
 * • 错误重试机制（2次指数退避） + 自定义颜色/背景
 * 🔗 脚本引用：https://raw.githubusercontent.com/jnlaoshu/MySelf/master/Egern/Widget/ServerMonitor.js
 * ⏱️ 更新时间：2026.03.30 11:00
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
        if (!body) throw new Error('私钥解析失败：内容为空');
        const bodyLines = body.match(/.{1,64}/g)?.join('\n') || body;
        k = `${header}\n${bodyLines}\n${footer}\n`;
      }
    }
    return k;
  };

  // ── 尺寸判断 ─────────────────────────────────────────────────────────────
  const family = (ctx.widgetFamily || 'systemMedium').toLowerCase();
  const isSmall = family.includes('small');
  const isLarge = family.includes('large');

  // ── 色彩系统 ─────────────────────────────────────────────────────────────
  const C = {
    bg:          [{ light: '#FFFFFF', dark: '#1C1C1E' }, { light: '#F2F2F7', dark: '#0C0C0E' }],
    main:        { light: '#1C1C1E', dark: '#FFFFFF' },
    sub:         { light: '#48484A', dark: '#D1D1D6' },
    muted:       { light: '#8E8E93', dark: '#8E8E93' },
    barBg:       { light: '#E5E5EA', dark: '#38383A' },
    cpu:         { light: '#34C759', dark: '#30D158' },
    mem:         { light: '#007AFF', dark: '#0A84FF' },
    disk:        { light: '#FF9500', dark: '#FF9F0A' },
    net:         { light: '#FF2D55', dark: '#FF375F' },
    tempLow:     { light: '#34C759', dark: '#30D158' },
    tempMid:     { light: '#FF9500', dark: '#FF9F0A' },
    tempHigh:    { light: '#FF3B30', dark: '#FF453A' },
    gpu:         { light: '#8B5CF6', dark: '#A78BFA' },
    gpuBg:       { light: '#F3E8FF', dark: '#2A1F3A' },
    cpuBg:       { light: '#EAF6ED', dark: '#1A291E' },
    memBg:       { light: '#EBF4FA', dark: '#1A2433' },
    dskBg:       { light: '#FDF1E3', dark: '#33261A' },
    netBg:       { light: '#FCEAEF', dark: '#331A20' },
    tempBg:      { light: '#FCE4E3', dark: '#331A1A' },
    transparent: '#00000000'
  };

  const overrideColor = (key, fallback) => {
    const lightKey = `CUSTOM_${key.toUpperCase()}_COLOR_LIGHT`;
    const darkKey  = `CUSTOM_${key.toUpperCase()}_COLOR_DARK`;
    return {
      light: ctx.env[lightKey] || fallback.light,
      dark:  ctx.env[darkKey]  || fallback.dark
    };
  };
  C.cpu = overrideColor('CPU', C.cpu);
  C.mem = overrideColor('MEM', C.mem);
  C.disk = overrideColor('DISK', C.disk);
  C.net = overrideColor('NET', C.net);
  C.gpu = overrideColor('GPU', C.gpu);

  let backgroundGradient = { type: 'linear', colors: C.bg, startPoint: { x: 0, y: 0 }, endPoint: { x: 1, y: 1 } };
  if (ctx.env.BG_LIGHT && ctx.env.BG_DARK) {
    backgroundGradient = { type: 'linear', colors: [{ light: ctx.env.BG_LIGHT, dark: ctx.env.BG_DARK }], startPoint: { x: 0, y: 0 }, endPoint: { x: 1, y: 1 } };
  }

  // ── UI 统一构建器 ─────────────────────────────────────────────────────
  const mkText   = (text, size, weight, color, opts = {}, fontOpts = {}) => ({ type: "text", text: String(text ?? ""), font: { size, weight, ...fontOpts }, textColor: color, ...opts });
  const mkRow    = (children, gap = 4, opts = {}) => ({ type: "stack", direction: "row", alignItems: "center", gap, children, ...opts });
  const mkIcon   = (src, color, size = 13) => ({ type: "image", src: `sf-symbol:${src}`, color, width: size, height: size });
  const mkSpacer = (length) => length != null ? { type: "spacer", length } : { type: "spacer" };

  // ── 服务器配置与轮播 ───────────────────────────────────────────────────
  let servers = [];
  for (let i = 1; i <= 5; i++) {
    const h = String(ctx.env[`SSH_SERVER_${i}_HOST`] || "").trim();
    if (!h) continue;
    servers.push({
      name:       String(ctx.env[`SSH_SERVER_${i}_NAME`] || `Server${i}`).trim(),
      host:       h, port: Number(ctx.env[`SSH_SERVER_${i}_PORT`]) || 22,
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
  const cycleDisabled = String(ctx.env.SSH_CYCLE_DISABLED || ctx.env.SSH_NO_CYCLE || "").toLowerCase() === 'true' || ctx.env.SSH_NO_CYCLE === '1';

  let cycleCounter = ctx.storage.getJSON('cycleCounter') || 0;
  cycleCounter = (cycleCounter + 1) % 999999;
  ctx.storage.setJSON('cycleCounter', cycleCounter);

  let currentIndex = ctx.storage.getJSON('multiServerIndex') || 0;
  if (currentIndex >= servers.length) currentIndex = 0;
  let displayIndex = currentIndex;

  if (servers.length > 1 && !cycleDisabled && cycleCounter % cycleEvery === 0) {
    displayIndex = (currentIndex + 1) % servers.length;
    ctx.storage.setJSON('multiServerIndex', displayIndex);
  }

  const server = servers[displayIndex];
  const serverKey = server.name.replace(/[^a-zA-Z0-9]/g, '_');

  if (!server.host) {
    return { type: 'widget', backgroundGradient, padding: 16, gap: 8, children: [
      mkText('⚠️ 监控未配置', 14, "bold", C.main),
      mkText('请在模块参数中填入 SSH 配置', 11, "medium", C.muted)
    ]};
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

  const updateTime = new Date();
  const relativeTime = () => {
    const diffMin = Math.floor((Date.now() - updateTime.getTime()) / 60000);
    if (diffMin < 1) return '刚刚';
    if (diffMin < 60) return `${diffMin}分钟前`;
    return `${Math.floor(diffMin / 60)}小时前`;
  };

  // ── SSH 数据获取 ───────────────────────────────────────────────────────
  let d = { host: server.host, hostname: server.name, serverIndex: displayIndex + 1, totalServers: servers.length, temp: 0, docker: 0, gpuUtil: 0, gpuMemPct: 0, gpuTemp: 0 };
  let session = null;
  const SEP = '<<SEP>>';

  const sshWithRetry = async (maxRetries = 2) => {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        session = await ctx.ssh.connect({
          host: server.host, port: server.port, username: server.username,
          ...(thisPrivateKey ? { privateKey: thisPrivateKey } : { password: server.password }),
          timeout: 8000,
        });

        const cmds = [
          'cat /proc/loadavg', 'cat /proc/uptime', 'head -1 /proc/stat', 'free -b', 'df -B1 / | tail -1', 'nproc',
          "awk '/^ *(eth|en|wlan|ens|eno|bond|veth)/{rx+=$2;tx+=$10}END{print rx,tx}' /proc/net/dev",
          'cat /sys/class/thermal/thermal_zone0/temp 2>/dev/null || cat /sys/class/hwmon/hwmon0/temp1_input 2>/dev/null || echo 0',
          'docker ps -q 2>/dev/null | wc -l || echo 0',
          'nvidia-smi --query-gpu=utilization.gpu,memory.used,memory.total,temperature.gpu --format=csv,noheader,nounits 2>/dev/null || echo "0,0,0,0"'
        ];

        const { stdout } = await session.exec(cmds.join(` && echo '${SEP}' && `));
        return stdout;
      } catch (e) {
        if (session) try { await session.close(); } catch (_) {}
        if (attempt === maxRetries) throw e;
        await new Promise(r => setTimeout(r, 500 * Math.pow(2, attempt)));
      }
    }
  };

  try {
    const stdout = await sshWithRetry();
    const p = stdout.split(SEP).map(s => s.trim());

    const la = (p[0] || '0 0 0').split(' ');
    d.load = [parseFloat(la[0]) || 0, parseFloat(la[1]) || 0, parseFloat(la[2]) || 0];

    const upSec = parseFloat((p[1] || '0').split(' ')[0]);
    if (!isNaN(upSec) && upSec > 0) {
      const y = Math.floor(upSec / 31536000); let rem = upSec % 31536000;
      const mo = Math.floor(rem / 2592000);   rem %= 2592000;
      const days = Math.floor(rem / 86400);   rem %= 86400;
      const h = Math.floor(rem / 3600);       rem %= 3600;
      const m = Math.floor(rem / 60);         const s = Math.floor(rem % 60);
      let uStr = "";
      if (y > 0) uStr += y + '年'; if (mo > 0) uStr += mo + '月'; if (days > 0) uStr += days + '日';
      if (h > 0) uStr += h + '时'; if (m > 0) uStr += m + '分'; uStr += s + '秒';
      d.uptimeStr = uStr;
    } else { d.uptimeStr = "0秒"; }

    const cpuNums = (p[2] || '').replace(/^cpu\s+/, '').split(/\s+/).map(Number);
    const cpuTotal = cpuNums.reduce((a, b) => a + b, 0), cpuIdle = cpuNums[3] || 0;
    const prevCpu = ctx.storage.getJSON(`_cpu_${serverKey}`);
    let cpuPct = 0;
    if (prevCpu && cpuTotal > prevCpu.t) cpuPct = Math.round(((cpuTotal - prevCpu.t - (cpuIdle - prevCpu.i)) / (cpuTotal - prevCpu.t)) * 100);
    ctx.storage.setJSON(`_cpu_${serverKey}`, { t: cpuTotal, i: cpuIdle });
    d.cpuPct = Math.max(0, Math.min(100, cpuPct));
    d.cores = parseInt(p[5]) || 1;

    const mm = ((p[3] || '').split('\n').find(l => /^Mem:/.test(l)) || '').split(/\s+/);
    d.memTotal = Number(mm[1]) || 1; d.memUsed = Number(mm[2]) || 0; d.memPct = Math.round((d.memUsed / d.memTotal) * 100);

    const df = (p[4] || '').split(/\s+/);
    d.diskTotal = Number(df[1]) || 1; d.diskUsed = Number(df[2]) || 0; d.diskPct = parseInt(df[4]) || 0;

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
    d.docker = parseInt(p[8]) || 0;

    // GPU 数据（MiB → Byte 转换）
    const gpuRaw = (p[9] || '0,0,0,0').split(',');
    d.gpuUtil = parseFloat(gpuRaw[0]) || 0;
    d.gpuMemUsed = (parseFloat(gpuRaw[1]) || 0) * 1048576;
    d.gpuMemTotal = (parseFloat(gpuRaw[2]) || 1) * 1048576;
    d.gpuMemPct = d.gpuMemTotal > 0 ? Math.round((d.gpuMemUsed / d.gpuMemTotal) * 100) : 0;
    d.gpuTemp = parseFloat(gpuRaw[3]) || 0;

  } catch (e) {
    d.error = String(e.message || e);
  } finally {
    if (session) try { await session.close(); } catch (_) {}
  }

  if (d.error) {
    return {
      type: 'widget', padding: 16, backgroundGradient,
      children: [
        mkText(`连接失败 [${server.name}]`, 14, "bold", C.tempHigh),
        mkSpacer(4), mkText(d.error, 10, "medium", C.muted, {}, { family: 'Menlo' })
      ]
    };
  }

  // ── 动态颜色 ───────────────────────────────────────────────────────────
  const cpuColor = d.cpuPct > 85 ? C.tempHigh : (d.cpuPct > 60 ? C.disk : C.cpu);
  const cpuBgColor = d.cpuPct > 85 ? C.netBg : (d.cpuPct > 60 ? C.dskBg : C.cpuBg);
  const getTempColor = (t) => t > 65 ? C.tempHigh : (t > 45 ? C.tempMid : C.tempLow);
  const tempColor = getTempColor(d.temp);
  const tempBgColor = C.tempBg;
  const gpuColor = d.gpuUtil > 80 ? C.tempHigh : (d.gpuUtil > 50 ? C.disk : C.gpu);
  const gpuBgColor = C.gpuBg;

  const buildBar = (pct, color, h = 4) => ({
    type: 'stack', direction: 'row', height: h, borderRadius: h / 2, backgroundColor: C.barBg,
    children: pct > 0 ? [
      { type: 'stack', flex: Math.max(1, pct), height: h, borderRadius: h / 2, backgroundColor: color, children: [] },
      ...(pct < 100 ? [{ type: 'spacer', flex: 100 - pct }] : [])
    ] : [mkSpacer()]
  });

  const header = () => mkRow([
    mkIcon('server.rack', C.main, isLarge ? 18 : 14), mkSpacer(6),
    mkText(d.hostname, isLarge ? 18 : 14, "heavy", C.main, { maxLines: 1 }),
    ...(d.totalServers > 1 ? [mkSpacer(6), mkText(`${d.serverIndex}/${d.totalServers}`, isLarge ? 11 : 9, "bold", C.muted, {}, { family: 'Menlo' })] : []),
    mkSpacer(),
    mkRow([ mkIcon('clock', C.disk, isLarge ? 13 : 11), mkText(d.uptimeStr, isLarge ? 12 : 10, "bold", C.disk, { maxLines: 1 }) ], isLarge ? 4 : 2),
    mkSpacer(8),
    mkRow([ mkIcon('thermometer', tempColor, isLarge ? 15 : 12), mkText(`${d.temp}°C`, isLarge ? 13 : 11, "heavy", tempColor, {}, { family: 'Menlo' }) ], 3),
    mkSpacer(6),
    mkText(relativeTime(), isLarge ? 10 : 9, "medium", C.muted, {}, { family: 'Menlo' })
  ], 0, { padding: 0 });

  // ── 小号尺寸 ───────────────────────────────────────────────────────────
  if (isSmall) {
    const miniCard = (icon, title, value, color, bg) => mkRow([
      mkRow([ mkIcon(icon, color, 13), mkText(title, 12, "heavy", color) ], 2, { width: 52 }),
      mkSpacer(), mkText(value, 12, "heavy", color, {}, { family: 'Menlo' })
    ], 0, { backgroundColor: bg, borderRadius: 8, padding: [4, 10] });

    return {
      type: 'widget', backgroundGradient, padding: 10, gap: 4,
      children: [
        header(), mkSpacer(2),
        miniCard('cpu', 'CPU', `${d.cpuPct}%`, cpuColor, cpuBgColor),
        miniCard('memorychip', 'MEM', `${d.memPct}%`, C.mem, C.memBg),
        miniCard('internaldrive', 'DSK', `${d.diskPct}%`, C.disk, C.dskBg),
        miniCard('network', 'NET', `↓${fmtBytes(d.rxRate)}/s`, C.net, C.netBg),
        miniCard('cpu.fill', 'GPU', `${d.gpuUtil}%`, gpuColor, gpuBgColor),
        mkSpacer()
      ]
    };
  }

  // ── 大号专属组件 ───────────────────────────────────────────────────────
  const statCardLarge = (icon, title, value, subtext, pct, color, bg) => ({
    type: 'stack', direction: 'column', flex: 1, backgroundColor: bg, borderRadius: 14, padding: [16, 16],
    children: [
      mkRow([ mkIcon(icon, color, 16), mkSpacer(6), mkText(title, 15, "heavy", color), mkSpacer(), mkText(value, 24, "heavy", color, {}, { family: 'Menlo' }) ], 0, { height: 28 }),
      mkSpacer(),
      { type: 'stack', direction: 'column', justifyContent: 'flex-start', gap: 10, children: [ buildBar(pct, color, 8), mkText(subtext, 13, "medium", C.sub, { maxLines: 1 }, { family: 'Menlo' }) ]}
    ]
  });

  const gpuCardLarge = () => ({
    type: 'stack', direction: 'column', flex: 1, backgroundColor: gpuBgColor, borderRadius: 14, padding: [16, 16],
    children: [
      mkRow([ mkIcon('cpu.fill', gpuColor, 16), mkSpacer(6), mkText('GPU', 15, "heavy", gpuColor), mkSpacer(), mkText(`${d.gpuUtil}%`, 24, "heavy", gpuColor, {}, { family: 'Menlo' }) ], 0, { height: 28 }),
      mkSpacer(),
      { type: 'stack', direction: 'column', justifyContent: 'flex-start', gap: 10, children: [ buildBar(d.gpuMemPct, gpuColor, 8), mkText(`${fmtBytes(d.gpuMemUsed)} / ${fmtBytes(d.gpuMemTotal)} | ${d.gpuTemp}°C`, 13, "medium", C.sub, { maxLines: 1 }, { family: 'Menlo' }) ]}
    ]
  });

  if (isLarge) {
    return {
      type: 'widget', backgroundGradient, padding: 16,
      children: [
        header(), mkSpacer(12),
        { type: 'stack', direction: 'column', flex: 1, gap: 12, children: [
          mkRow([ 
            statCardLarge('cpu', 'CPU', `${d.cpuPct}%`, `${d.cores}核 | Ld: ${d.load.join('/')} | 🐳${d.docker}`, d.cpuPct, cpuColor, cpuBgColor), 
            statCardLarge('memorychip', 'MEM', `${d.memPct}%`, `${fmtBytes(d.memUsed)} / ${fmtBytes(d.memTotal)}`, d.memPct, C.mem, C.memBg) 
          ], 12, { flex: 1 }),
          mkRow([ 
            statCardLarge('internaldrive', 'DSK', `${d.diskPct}%`, `${fmtBytes(d.diskUsed)} / ${fmtBytes(d.diskTotal)}`, d.diskPct, C.disk, C.dskBg), 
            gpuCardLarge()
          ], 12, { flex: 1 })
        ]}
      ]
    };
  }

  // ── 中号组件 ───────────────────────────────────────────────────────────
  const statCard = (icon, title, value, subtext, pct, color, bg) => ({
    type: 'stack', direction: 'column', flex: 1, backgroundColor: bg, borderRadius: 8, padding: [8, 12],
    children: [
      mkRow([ mkRow([ mkIcon(icon, color, 13), mkText(title, 12, "heavy", color) ], 2, { width: 52 }), mkSpacer(), mkText(value, 13, "heavy", color, {}, { family: 'Menlo' }) ], 4, { height: 16 }),
      mkSpacer(),
      { type: 'stack', direction: 'column', height: 24, justifyContent: 'flex-start', gap: 4, children: [ buildBar(pct, color), mkText(subtext, 9, "medium", C.sub, { maxLines: 1 }, { family: 'Menlo' }) ]}
    ]
  });

  const gpuCard = () => ({
    type: 'stack', direction: 'column', flex: 1, backgroundColor: gpuBgColor, borderRadius: 8, padding: [8, 12],
    children: [
      mkRow([ mkRow([ mkIcon('cpu.fill', gpuColor, 13), mkText('GPU', 12, "heavy", gpuColor) ], 2, { width: 52 }), mkSpacer(), mkText(`${d.gpuUtil}%`, 13, "heavy", gpuColor, {}, { family: 'Menlo' }) ], 4, { height: 16 }),
      mkSpacer(),
      { type: 'stack', direction: 'column', height: 24, justifyContent: 'flex-start', gap: 4, children: [ buildBar(d.gpuMemPct, gpuColor), mkText(`${fmtBytes(d.gpuMemUsed)} / ${fmtBytes(d.gpuMemTotal)} | ${d.gpuTemp}°C`, 9, "medium", C.sub, { maxLines: 1 }, { family: 'Menlo' }) ]}
    ]
  });

  return {
    type: 'widget', backgroundGradient, padding: [10, 14, 12, 14],
    children: [
      header(), mkSpacer(6),
      mkRow([ 
        statCard('cpu', 'CPU', `${d.cpuPct}%`, `${d.cores}核 | Ld: ${d.load.join('/')} | 🐳${d.docker}`, d.cpuPct, cpuColor, cpuBgColor), 
        statCard('memorychip', 'MEM', `${d.memPct}%`, `${fmtBytes(d.memUsed)} / ${fmtBytes(d.memTotal)}`, d.memPct, C.mem, C.memBg) 
      ], 4, { flex: 1 }),
      mkSpacer(4),
      mkRow([ 
        statCard('internaldrive', 'DSK', `${d.diskPct}%`, `${fmtBytes(d.diskUsed)} / ${fmtBytes(d.diskTotal)}`, d.diskPct, C.disk, C.dskBg), 
        gpuCard()
      ], 4, { flex: 1 })
    ]
  };
}

/**
 * ==========================================
 * 📌 代码名称: 🖥️ 服务器监控
 * ✨ 主要功能: 基于 Egern 原生 SSH 引擎构建的服务器探针。采用 Apple 原生 Bento Box 四宫格悬浮卡片布局，搭载 Cyber-Pro 专属色彩引擎，全局支持系统深浅色自适应；并发抓取并流式渲染 CPU、内存、磁盘与网络 I/O 核心负载，提供兼具硬核性能与极简美学的桌面级运维体验。
 * 🔗 引用链接: https://raw.githubusercontent.com/jnlaoshu/MySelf/master/Egern/Widget/ServerMonitor.js
 * ⏱️ 更新时间: 2026.03.18 23:10
 * ==========================================
 */

export default async function (ctx) {
  if (ctx.env) {
    ctx.env.host = ctx.env.SSH_HOST || ctx.env.host || "";
    ctx.env.username = ctx.env.SSH_USER || ctx.env.username || "root";
    ctx.env.password = ctx.env.SSH_PWD || ctx.env.password || "";
    ctx.env.privateKey = ctx.env.SSH_KEY || ctx.env.privateKey || "";
    ctx.env.port = ctx.env.SSH_PORT || ctx.env.port || 22;
  }
  
  const customName = (ctx.env.SSH_NAME || "").trim();

  const fmtBytes = b => {
    if (b >= 1e12) return (b / 1e12).toFixed(1) + 'T';
    if (b >= 1e9)  return (b / 1e9).toFixed(1) + 'G';
    if (b >= 1e6)  return (b / 1e6).toFixed(1) + 'M';
    if (b >= 1e3)  return (b / 1e3).toFixed(0) + 'K';
    return Math.round(b) + 'B';
  };

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

    const memLine = (p[4] || '').split('\n').find(l => /^Mem:/.test(l)) || '';
    const mm = memLine.split(/\s+/);
    const memTotal = Number(mm[1]) || 1, memUsed = Number(mm[2]) || 0;
    const memPct = Math.round((memUsed / memTotal) * 100);

    const df = (p[5] || '').split(/\s+/);
    const diskTotal = Number(df[1]) || 1, diskUsed = Number(df[2]) || 0;
    const diskPct = parseInt(df[4]) || 0;
    const cores = parseInt(p[6]) || 1;

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

    const tempRaw = parseInt(p[9]) || 0;
    const temp = tempRaw > 1000 ? Math.round(tempRaw / 1000) : tempRaw;
    const procs = parseInt(p[11]) || 0;

    d = { hostname, load, uptime, cpuPct, cores, memTotal, memUsed, memPct, diskTotal, diskUsed, diskPct, rxRate, txRate, netRx, netTx, temp, procs };
  } catch (e) {
    d = { error: String(e.message || e) };
  }

  const C = {
    bg: { light: '#F2F2F7', dark: '#000000' },
    cellBg: { light: '#FFFFFF', dark: '#1C1C1E' },
    barBg: { light: '#E5E5EA', dark: '#2C2C2E' },
    text: { light: '#1D1D1F', dark: '#F5F5F7' },
    muted: { light: '#86868B', dark: '#98989D' },
    dim: { light: '#A1A1A6', dark: '#636366' },
    cpu: { light: '#00C7BE', dark: '#32ADE6' },
    mem: { light: '#AF52DE', dark: '#BF5AF2' },
    disk: { light: '#FF9500', dark: '#FF9F0A' },
    net: { light: '#FF2D55', dark: '#FF375F' },
    temp: { light: '#FF3B30', dark: '#FF453A' },
  };

  const pctColor = (pct, lo, hi) => pct >= hi ? C.temp : pct >= lo ? C.disk : C.cpu;

  const bar = (pct, color, h = 5) => ({
    type: 'stack', direction: 'row', height: h, borderRadius: h / 2,
    backgroundColor: C.barBg,
    children: pct > 0
      ? [
          { type: 'stack', flex: Math.max(1, pct), height: h, borderRadius: h / 2, backgroundColor: color, children: [] },
          ...(pct < 100 ? [{ type: 'spacer', flex: 100 - pct }] : []),
        ]
      : [{ type: 'spacer' }],
  });

  const bentoCell = (icon, label, pct, detailText, color) => ({
    type: 'stack', direction: 'column', flex: 1,
    backgroundColor: C.cellBg, cornerRadius: 14, padding: 10, gap: 5,
    children: [
      { type: 'stack', direction: 'row', alignItems: 'center', gap: 4, children: [
        { type: 'image', src: `sf-symbol:${icon}`, color: color, width: 14, height: 14 },
        { type: 'text', text: label, font: { size: 11, weight: 'bold' }, textColor: C.text },
        { type: 'spacer' },
        { type: 'text', text: `${pct}%`, font: { size: 14, weight: 'heavy', family: 'Menlo' }, textColor: color }
      ]},
      { type: 'spacer' },
      bar(pct, color, 5),
      { type: 'text', text: detailText, font: { size: 9, family: 'Menlo' }, textColor: C.dim, maxLines: 1 }
    ]
  });

  const netCell = () => ({
    type: 'stack', direction: 'column', flex: 1,
    backgroundColor: C.cellBg, cornerRadius: 14, padding: 10, gap: 5,
    children: [
      { type: 'stack', direction: 'row', alignItems: 'center', gap: 4, children: [
        { type: 'image', src: 'sf-symbol:network', color: C.net, width: 14, height: 14 },
        { type: 'text', text: 'NET', font: { size: 11, weight: 'bold' }, textColor: C.text },
        { type: 'spacer' }
      ]},
      { type: 'spacer' },
      { type: 'stack', direction: 'row', children: [
        { type: 'text', text: `↓${fmtBytes(d.rxRate)}/s`, font: { size: 10, weight: 'bold', family: 'Menlo' }, textColor: C.net },
        { type: 'spacer' },
        { type: 'text', text: `↑${fmtBytes(d.txRate)}/s`, font: { size: 10, weight: 'bold', family: 'Menlo' }, textColor: C.mem }
      ]},
      { type: 'stack', direction: 'row', children: [
        { type: 'text', text: `↓${fmtBytes(d.netRx)}`, font: { size: 8, family: 'Menlo' }, textColor: C.dim },
        { type: 'spacer' },
        { type: 'text', text: `↑${fmtBytes(d.netTx)}`, font: { size: 8, family: 'Menlo' }, textColor: C.dim }
      ]}
    ]
  });

  const header = () => ({
    type: 'stack', direction: 'row', alignItems: 'center', gap: 6, padding: [0, 4, 2, 4], children: [
      { type: 'image', src: 'sf-symbol:server.rack', color: C.text, width: 15, height: 15 },
      { type: 'text', text: d.hostname, font: { size: 16, weight: 'heavy' }, textColor: C.text, maxLines: 1 },
      { type: 'spacer' },
      ...(d.temp > 0 ? [
        { type: 'image', src: 'sf-symbol:thermometer.medium', color: pctColor(d.temp, 60, 80), width: 12, height: 12 },
        { type: 'text', text: `${d.temp}°`, font: { size: 12, weight: 'bold', family: 'Menlo' }, textColor: pctColor(d.temp, 60, 80) },
        { type: 'spacer', length: 4 }
      ] : []),
      { type: 'text', text: d.uptime, font: { size: 10, weight: 'medium' }, textColor: C.muted, maxLines: 1 },
    ],
  });

  if (d.error) {
    return {
      type: 'widget', padding: 16, gap: 8, backgroundColor: C.bg,
      children: [
        { type: 'stack', direction: 'row', alignItems: 'center', gap: 8, children: [
          { type: 'image', src: 'sf-symbol:exclamationmark.triangle.fill', color: C.temp, width: 22, height: 22 },
          { type: 'text', text: '连接已断开', font: { size: 16, weight: 'heavy' }, textColor: C.text },
        ]},
        { type: 'text', text: d.error, font: { size: 11, family: 'Menlo' }, textColor: C.muted, maxLines: 3 },
      ],
    };
  }

  if (ctx.widgetFamily === 'systemMedium') {
    return {
      type: 'widget', backgroundColor: C.bg, padding: 14,
      children: [
        header(),
        { type: 'spacer', length: 6 },
        { type: 'stack', direction: 'row', gap: 8, children: [
          bentoCell('cpu', 'CPU', d.cpuPct, `${d.cores}C | Ld: ${d.load[0]}`, pctColor(d.cpuPct, 60, 85)),
          bentoCell('memorychip', 'MEM', d.memPct, `${fmtBytes(d.memUsed)} / ${fmtBytes(d.memTotal)}`, C.mem)
        ]},
        { type: 'spacer', length: 8 },
        { type: 'stack', direction: 'row', gap: 8, children: [
          bentoCell('internaldrive', 'DSK', d.diskPct, `${fmtBytes(d.diskUsed)} / ${fmtBytes(d.diskTotal)}`, pctColor(d.diskPct, 70, 90)),
          netCell()
        ]}
      ],
    };
  }

  if (ctx.widgetFamily === 'systemSmall') {
    return {
      type: 'widget', backgroundColor: C.bg, padding: 12, gap: 6,
      children: [
        header(),
        { type: 'spacer', length: 2 },
        bentoCell('cpu', 'CPU', d.cpuPct, `Load: ${d.load[0]}`, pctColor(d.cpuPct, 60, 85)),
        bentoCell('memorychip', 'MEM', d.memPct, `${fmtBytes(d.memUsed)}`, C.mem),
      ],
    };
  }

  return {
    type: 'widget', backgroundColor: C.bg, padding: 16,
    children: [{ type: 'text', text: '全新 Bento 布局专为 Medium 尺寸打造，请切换小组件尺寸体验。', textColor: C.text, font: { size: 14, weight: 'medium' } }]
  };
}

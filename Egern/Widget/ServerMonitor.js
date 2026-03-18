/**
 * ==========================================
 * 📌 代码名称: 🖥️ 服务器核心探针 (SSH 监控面板)
 * ✨ 主要功能: 通过原生 SSH 隧道直连远程 VPS、NAS 或软路由；实时抓取并解析系统负载 (Load)、磁盘占用率 (Disk) 与在线状态；采用极简正则解析引擎，兼容 Linux / macOS / OpenWrt；原生弹性流式布局，防崩溃断连保护。
 * 🔗 引用链接: https://raw.githubusercontent.com/jnlaoshu/MySelf/master/Egern/Widget/ServerMonitor.js
 * ⏱️ 更新时间: 2026.03.18 16:30
 * ==========================================
 */

export default async function(ctx) {
  const env = ctx.env || {};
  const host = (env.SSH_HOST || "").trim();
  const user = (env.SSH_USER || "root").trim();
  const key = (env.SSH_KEY || "").trim();
  const serverName = (env.SSH_NAME || "My Server").trim();

  const C = {
    bg: [{ light: '#FFFFFF', dark: '#1C1C1E' }, { light: '#F5F5F9', dark: '#0C0C0E' }],
    main: { light: '#1C1C1E', dark: '#FFFFFF' },
    sub: { light: '#48484A', dark: '#D1D1D6' },
    muted: { light: '#8E8E93', dark: '#8E8E93' },
    online: { light: '#2E8045', dark: '#32D74B' },
    offline: { light: '#CA3B32', dark: '#FF453A' },
    blue: { light: '#3A5F85', dark: '#5E8EB8' }
  };

  let isOnline = false;
  let sysLoad = "--";
  let diskUsed = "--";
  let uptimeStr = "连接中...";

  if (!host || !key) {
    uptimeStr = "未配置 Host 或私钥";
  } else {
    try {
      // 严格按照官方最新 API 规范进行安全握手
      const session = await ctx.ssh.connect({
        host: host,
        username: user,
        privateKey: key
      });

      isOnline = true;
      uptimeStr = "运行良好";

      // 并发执行基础探针指令
      const [{ stdout: upRaw }, { stdout: dfRaw }] = await Promise.all([
        session.exec('uptime'),
        session.exec('df -h /')
      ]);

      await session.close();

      // 本地极速正则解析引擎 (防止依赖远端 awk 导致报错)
      const loadMatch = upRaw.match(/load averages?:\s*([\d\.]+)/);
      if (loadMatch) sysLoad = loadMatch[1];

      const diskLines = dfRaw.trim().split('\n');
      if (diskLines.length > 1) {
        const diskMatch = diskLines[1].match(/(\d+%)/);
        if (diskMatch) diskUsed = diskMatch[1];
      }

    } catch (err) {
      isOnline = false;
      uptimeStr = "服务器离线或密钥拒绝";
    }
  }

  const buildRow = (icon, label, value) => ({
    type: 'stack', direction: 'row', alignItems: 'center', gap: 6, children: [
      { type: 'stack', direction: 'row', alignItems: 'center', gap: 4, width: 55, children: [
        { type: 'image', src: `sf-symbol:${icon}`, color: C.muted, width: 13, height: 13 },
        { type: 'text', text: label, font: { size: 12, weight: 'heavy' }, textColor: C.muted }
      ]},
      { type: 'text', text: String(value), font: { size: 13, weight: 'bold' }, textColor: C.main, flex: 1, maxLines: 1 }
    ]
  });

  return {
    type: 'widget', padding: 12,
    backgroundGradient: { type: 'linear', colors: C.bg, startPoint: { x: 0, y: 0 }, endPoint: { x: 1, y: 1 } },
    children: [
      { type: 'stack', direction: 'row', alignItems: 'center', gap: 6, children: [
        { type: 'image', src: 'sf-symbol:server.rack', color: C.blue, width: 16, height: 16 },
        { type: 'text', text: serverName, font: { size: 15, weight: 'heavy' }, textColor: C.main },
        { type: 'spacer' },
        { type: 'stack', direction: 'row', alignItems: 'center', gap: 4, children: [
          { type: 'image', src: isOnline ? 'sf-symbol:circle.fill' : 'sf-symbol:xmark.circle.fill', color: isOnline ? C.online : C.offline, width: 8, height: 8 },
          { type: 'text', text: isOnline ? '在线' : '离线', font: { size: 11, weight: 'heavy' }, textColor: isOnline ? C.online : C.offline }
        ]}
      ]},
      { type: 'spacer', length: 12 },
      { type: 'stack', direction: 'column', gap: 8, children: [
        buildRow('cpu', '负载', sysLoad),
        buildRow('internaldrive', '系统盘', diskUsed),
        buildRow('waveform.path.ecg', '状态', uptimeStr)
      ]},
      { type: 'spacer' }
    ]
  };
}

/**
 * ==========================================
 * 📌 2026世界杯赛程 (WorldCup2026) 小组件
 *
 * 【功能说明】
 * • 尺寸自适应：全面支持小号(紧凑型)、中号(今日完美布局)、大号(今明两日赛程)的三种独立布局。
 * • 布局排版：中号/大号采用左侧日期与右侧赛事的对齐结构；小号采用三列固定宽度强制对齐布局。
 * • 赛事引擎：实时调用 ESPN API 获取赛事日程及比分，网络异常提供容错。
 * • 汉化字典：内置百余个国家队中英汉化与国旗字典库，智能翻转主客队国旗以保持视觉完美对称。
 *
 * 🔗 引用链接: https://raw.githubusercontent.com/jnlaoshu/MySelf/master/Egern/Widget/WorldCup2026.js
 * ⏱️ 更新时间: 2026.06.27 21:12
 * ==========================================
 */

// ---------------------------
// 全局样式微调参数
// ---------------------------
const CARD_CORNER_RADIUS = 12;

// 小号三列固定宽度
const SMALL_COL_HOME  = 50;
const SMALL_COL_SCORE = 30;
const SMALL_COL_AWAY  = 50;

// 小号行间距
const SMALL_ROW_GAP = 3;

// ---------------------------
// 终极汉化与国旗字典库
// ---------------------------
const teamNamesCN = {
  "United States": "🇺🇸 美国", "USA": "🇺🇸 美国", "Canada": "🇨🇦 加拿大", "Mexico": "🇲🇽 墨西哥",
  "Costa Rica": "🇨🇷 哥斯达黎加", "Panama": "🇵🇦 巴拿马", "Jamaica": "🇯🇲 牙买加", "Honduras": "🇭🇳 洪都拉斯",
  "El Salvador": "🇸🇻 萨尔瓦多", "Haiti": "🇭🇹 海地", "Curaçao": "🇨🇼 库拉索", "Trinidad and Tobago": "🇹🇹 特立尼达和多巴哥",
  "Guatemala": "🇬🇹 危地马拉", "Cuba": "🇨🇺 古巴",
  "Brazil": "🇧🇷 巴西", "Argentina": "🇦🇷 阿根廷", "Uruguay": "🇺🇾 乌拉圭", "Colombia": "🇨🇴 哥伦比亚",
  "Peru": "🇵🇪 秘鲁", "Chile": "🇨🇱 智利", "Ecuador": "🇪🇨 厄瓜多尔", "Paraguay": "🇵🇾 巴拉圭",
  "Venezuela": "🇻🇪 委内瑞拉", "Bolivia": "🇧🇴 玻利维亚",
  "France": "🇫🇷 法国", "Germany": "🇩🇪 德国", "Spain": "🇪🇸 西班牙", "England": "🏴󠁧󠁢󠁥󠁮󠁧󠁿 英格兰",
  "Portugal": "🇵🇹 葡萄牙", "Netherlands": "🇳🇱 荷兰", "Italy": "🇮🇹 意大利", "Croatia": "🇭🇷 克罗地亚",
  "Belgium": "🇧🇪 比利时", "Denmark": "🇩🇰 丹麦", "Switzerland": "🇨🇭 瑞士", "Sweden": "🇸🇪 瑞典",
  "Wales": "🏴󠁧󠁢󠁷󠁬󠁳󠁿 威尔士", "Poland": "🇵🇱 波兰", "Serbia": "🇷🇸 塞尔维亚", "Scotland": "🏴󠁧󠁢󠁳󠁣󠁴󠁿 苏格兰",
  "Ukraine": "🇺🇦 乌克兰", "Czechia": "🇨🇿 捷克", "Czech Republic": "🇨🇿 捷克", "Austria": "🇦🇹 奥地利",
  "Hungary": "🇭🇺 匈牙利", "Türkiye": "🇹🇷 土耳其", "Turkey": "🇹🇷 土耳其", "Norway": "🇳🇴 挪威",
  "Finland": "🇫🇮 芬兰", "Romania": "🇷🇴 罗马尼亚", "Slovakia": "🇸🇰 斯洛伐克", "Greece": "🇬🇷 希腊",
  "Ireland": "🇮🇪 爱尔兰", "Republic of Ireland": "🇮🇪 爱尔兰", "Northern Ireland": "🇬🇧 北爱尔兰",
  "Bosnia-Herzegovina": "🇧🇦 波黑", "Bosnia and Herzegovina": "🇧🇦 波黑", "Iceland": "🇮🇸 冰岛",
  "Albania": "🇦🇱 阿尔巴尼亚", "Georgia": "🇬🇪 格鲁吉亚", "Slovenia": "🇸🇮 斯洛文尼亚",
  "Bulgaria": "🇧🇬 保加利亚", "North Macedonia": "🇲🇰 北马其顿", "Montenegro": "🇲🇪 黑山",
  "Senegal": "🇸🇳 塞内加尔", "Morocco": "🇲🇦 摩洛哥", "Cameroon": "🇨🇲 喀麦隆", "Ghana": "🇬🇭 加纳",
  "Tunisia": "🇹🇳 突尼斯", "Egypt": "🇪🇬 埃及", "Algeria": "🇩🇿 阿尔及利亚", "Nigeria": "🇳🇬 尼日利亚",
  "Mali": "🇲🇱 马里", "Ivory Coast": "🇨🇮 科特迪瓦", "Côte d'Ivoire": "🇨🇮 科特迪瓦",
  "South Africa": "🇿🇦 南非", "Burkina Faso": "🇧🇫 布基纳法索", "Congo DR": "🇨🇩 刚果(金)",
  "DR Congo": "🇨🇩 刚果(金)", "Guinea": "🇬🇳 几内亚", "Cabo Verde": "🇨🇻 佛得角", "Cape Verde": "🇨🇻 佛得角",
  "Equatorial Guinea": "🇬🇶 赤道几内亚", "Zambia": "🇿🇲 赞比亚", "Angola": "🇦🇴 安哥拉",
  "Japan": "🇯🇵 日本", "South Korea": "🇰🇷 韩国", "Korea Republic": "🇰🇷 韩国", "Iran": "🇮🇷 伊朗",
  "Saudi Arabia": "🇸🇦 沙特阿拉伯", "Australia": "🇦🇺 澳大利亚", "Qatar": "🇶🇦 卡塔尔", "United Arab Emirates": "🇦🇪 阿联酋",
  "UAE": "🇦🇪 阿联酋", "Iraq": "🇮🇶 伊拉克", "Oman": "🇴🇲 阿曼", "China PR": "🇨🇳 中国", "China": "🇨🇳 中国",
  "Syria": "🇸🇾 叙利亚", "Uzbekistan": "🇺🇿 乌兹别克斯坦", "Jordan": "🇯🇴 约旦", "Bahrain": "🇧🇭 巴林",
  "Palestine": "🇵🇸 巴勒斯坦", "Indonesia": "🇮🇩 印尼", "Vietnam": "🇻🇳 越南", "Thailand": "🇹🇭 泰国",
  "North Korea": "🇰🇵 朝鲜", "Korea DPR": "🇰🇵 朝鲜", "Lebanon": "🇱🇧 黎巴嫩", "Kuwait": "🇰🇼 科威特",
  "New Zealand": "🇳🇿 新西兰", "Fiji": "🇫🇯 斐济", "Solomon Islands": "🇸🇧 所罗门群岛"
};

// 完整队名（不截断）
function translateTeam(englishName, isHome = false) {
  if (!englishName) return isHome ? "未知 🏳️" : "🏳️ 未知";
  let name = englishName.replace(/ national (football|soccer) team/i, "").trim();
  name = name.replace(/ men's/i, "").trim();
  const defaultStr = teamNamesCN[name] || `🏳️ ${name}`;
  let result = defaultStr;
  if (isHome) {
    const parts = defaultStr.split(" ");
    if (parts.length >= 2) {
      result = `${parts.slice(1).join(" ")} ${parts[0]}`;
    }
  }
  return result;
}

// 小号专用：完整队名
function translateTeamPlain(englishName) {
  if (!englishName) return "未知";
  let name = englishName.replace(/ national (football|soccer) team/i, "").trim();
  name = name.replace(/ men's/i, "").trim();
  const full = teamNamesCN[name];
  if (full) {
    const parts = full.split(" ");
    return parts.length >= 2 ? parts.slice(1).join(" ") : full;
  }
  return name;
}

// ---------------------------
// 列宽参数（中号/大号）
// ---------------------------
const COL_WIDTH_LEFT   = 36;
const COL_WIDTH_TIME   = 34;
const COL_WIDTH_STATUS = 40;
const COL_WIDTH_TEAM   = 88;
const COL_WIDTH_SCORE  = 30;

// ---------------------------
// 自适应配色系统
// ---------------------------
const T = {
  widgetBg:        { light: "#F2F2F7",  dark: "#161618" },
  todayCardBg:     { light: "#D6F5E3",  dark: "#0D2016" },
  todayLabel:      { light: "#1A7F3C",  dark: "#30D158" },
  todayDate:       { light: "#3DA85A",  dark: "#248A3D" },
  tomorrowCardBg:  { light: "#D6EAF8",  dark: "#0D1A26" },
  tomorrowLabel:   { light: "#1A5CA8",  dark: "#5AC8FA" },
  tomorrowDate:    { light: "#3A7DC9",  dark: "#2C6E9E" },
  updateTime:      { light: "#AAAAAA",  dark: "#666666" },
  matchTime:       { light: "#555555",  dark: "#AEAEB2" },
  teamName:        { light: "#111111",  dark: "#FFFFFF" },
  statusFinished:  { light: "#999999",  dark: "#8E8E93" },
  statusLive:      { light: "#D0021B",  dark: "#FF453A" },
  statusPending:   { light: "#999999",  dark: "#636366" },
  scoreLive:       { light: "#D0021B",  dark: "#FF453A" },
  scoreFinished:   { light: "#333333",  dark: "#EBEBEB" },
  vs:              { light: "#AAAAAA",  dark: "#636366" },
  noMatch:         { light: "#AAAAAA",  dark: "#636366" },
  divider:         { light: "#D0D0D5",  dark: "#2C2C2E" },
};

// ---------------------------
// 辅助函数
// ---------------------------
const shortWeekNames = ["周日","周一","周二","周三","周四","周五","周六"];

function getBjDateParts(ts) {
  const bjDate = new Date(ts + 8 * 60 * 60 * 1000);
  return {
    month: bjDate.getUTCMonth() + 1,
    date:  bjDate.getUTCDate(),
    week:  shortWeekNames[bjDate.getUTCDay()],
    str:   `${bjDate.getUTCFullYear()}${String(bjDate.getUTCMonth()+1).padStart(2,'0')}${String(bjDate.getUTCDate()).padStart(2,'0')}`
  };
}

// ---------------------------
// Egern 小组件主入口
// ---------------------------
export default async function(ctx) {
  let family = "medium";
  const rawFamily = ctx.family || ctx.widgetFamily || "medium";
  const fStr = String(rawFamily).toLowerCase();
  if (fStr.includes("small") || fStr === "0") {
    family = "small";
  } else if (fStr.includes("large") || fStr === "2") {
    family = "large";
  }

  const now   = new Date();
  const nowTs = now.getTime();

  const fetchStart = new Date(nowTs - 2 * 24 * 60 * 60 * 1000);
  const fetchEnd   = new Date(nowTs + 2 * 24 * 60 * 60 * 1000);

  const getApiDateStr = (date) => {
    const yyyy = date.getFullYear();
    const mm   = String(date.getMonth() + 1).padStart(2, '0');
    const dd   = String(date.getDate()).padStart(2, '0');
    return `${yyyy}${mm}${dd}`;
  };

  const todParts = getBjDateParts(nowTs);
  const tomParts = getBjDateParts(nowTs + 24 * 60 * 60 * 1000);

  const dayConfigLarge = [
    {
      key: "今天", label: "今天", dateStr: todParts.str,
      month: todParts.month, date: todParts.date, week: todParts.week,
      labelColor: T.todayLabel, dateColor: T.todayDate, cardBg: T.todayCardBg
    },
    {
      key: "明天", label: "明天", dateStr: tomParts.str,
      month: tomParts.month, date: tomParts.date, week: tomParts.week,
      labelColor: T.tomorrowLabel, dateColor: T.tomorrowDate, cardBg: T.tomorrowCardBg
    }
  ];

  const dayConfigMedium = [
    {
      key: "今天", label: "今天", dateStr: todParts.str,
      month: todParts.month, date: todParts.date, week: todParts.week,
      labelColor: T.todayLabel, dateColor: T.todayDate
    }
  ];

  const url = `https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard?dates=${getApiDateStr(fetchStart)}-${getApiDateStr(fetchEnd)}`;
  let matches = [];
  let fetchSuccess = false;

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res  = await ctx.http.get(url);
      const data = await res.json();
      if (data && data.events) {
        matches = data.events;
        fetchSuccess = true;
        break;
      }
    } catch (e) { }
  }

  const updateStr = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;

  const groupedMatches = { "今天": [], "明天": [] };

  matches.forEach(match => {
    const matchTimestamp = new Date(match.date).getTime();
    const bjMatch        = new Date(matchTimestamp + 8 * 60 * 60 * 1000);
    const matchDateStr   = getBjDateParts(matchTimestamp).str;

    let targetKey = null;
    if (matchDateStr === todParts.str) targetKey = "今天";
    else if (matchDateStr === tomParts.str) targetKey = "明天";
    if (!targetKey) return;

    const comp        = match.competitions[0];
    const homeCmp     = comp.competitors.find(c => c.homeAway === 'home');
    const awayCmp     = comp.competitors.find(c => c.homeAway === 'away');
    const statusState = match.status.type.state;
    const statusDesc  = match.status.type.shortDetail || match.status.type.description || "";

    let statusText = "未开赛";
    if (statusState === "post") {
      statusText = "已结束";
    } else if (statusState === "in") {
      statusText = statusDesc.replace("'", "'") || "进行中";
    }

    groupedMatches[targetKey].push({
      time:       `${String(bjMatch.getUTCHours()).padStart(2,'0')}:${String(bjMatch.getUTCMinutes()).padStart(2,'0')}`,
      home:       homeCmp,
      away:       awayCmp,
      status:     statusState,
      statusText: statusText,
    });
  });

  // 统一标题栏顶部距离为 2
  const TITLE_TOP_SPACER = 2;

  /**
   * ======================================
   * 👑 小号模式 (Small)
   * ======================================
   */
  if (family === "small") {
    const todayMatches = groupedMatches["今天"] || [];

    const smallHeader = {
      type: "stack", direction: "row", alignItems: "center",
      children: [
        { type: "text", text: "🏆", font: { size: 13 } },
        { type: "spacer", length: 4 },
        { type: "text", text: "今日赛程", font: { size: 13, weight: "bold" }, textColor: T.teamName },
        { type: "spacer" },
        { type: "text", text: updateStr, font: { size: 9 }, textColor: T.updateTime }
      ]
    };

    let smallChildren = [
      { type: "spacer", length: TITLE_TOP_SPACER },
      smallHeader,
      { type: "spacer", length: SMALL_ROW_GAP + 1 },
      { type: "stack", direction: "row", backgroundColor: T.divider, height: 0.5, children: [] },
      { type: "spacer", length: SMALL_ROW_GAP }
    ];

    if (!fetchSuccess) {
      smallChildren.push({ type: "spacer" });
      smallChildren.push({ type: "text", text: "⚠️ 网络异常，数据加载失败", font: { size: 11 }, textColor: T.statusLive });
      smallChildren.push({ type: "spacer" });
    } else if (todayMatches.length === 0) {
      smallChildren.push({ type: "spacer" });
      smallChildren.push({ type: "text", text: "今日暂无赛事", font: { size: 12 }, textColor: T.noMatch });
      smallChildren.push({ type: "spacer" });
    } else {
      for (let i = 0; i < todayMatches.length; i++) {
        const m = todayMatches[i];

        const homeName = translateTeamPlain(m.home.team.name || m.home.team.shortDisplayName);
        const awayName = translateTeamPlain(m.away.team.name || m.away.team.shortDisplayName);

        let scoreStr   = "vs";
        let scoreColor = T.vs;
        let scoreFont  = { size: 11, weight: "medium" };
        if (m.status === "post" || m.status === "in") {
          scoreStr   = `${m.home.score}-${m.away.score}`;
          scoreColor = m.status === "in" ? T.scoreLive : T.scoreFinished;
          scoreFont  = { size: 11, weight: "bold" };
        }

        const matchRow = {
          type: "stack", direction: "row", alignItems: "center",
          children: [
            {
              type: "stack", direction: "row", width: SMALL_COL_HOME, alignItems: "center",
              children: [
                { type: "spacer" },
                { type: "text", text: homeName, font: { size: 10, weight: "medium" }, textColor: T.teamName }
              ]
            },
            {
              type: "stack", direction: "row", width: SMALL_COL_SCORE, alignItems: "center",
              children: [
                { type: "spacer" },
                { type: "text", text: scoreStr, font: scoreFont, textColor: scoreColor },
                { type: "spacer" }
              ]
            },
            {
              type: "stack", direction: "row", width: SMALL_COL_AWAY, alignItems: "center",
              children: [
                { type: "text", text: awayName, font: { size: 10, weight: "medium" }, textColor: T.teamName },
                { type: "spacer" }
              ]
            }
          ]
        };

        smallChildren.push(matchRow);

        if (i < todayMatches.length - 1) {
          smallChildren.push({ type: "spacer", length: SMALL_ROW_GAP });
          smallChildren.push({ type: "stack", direction: "row", backgroundColor: T.divider, height: 0.5, children: [] });
          smallChildren.push({ type: "spacer", length: SMALL_ROW_GAP });
        }
      }
    }

    smallChildren.push({ type: "spacer" });

    return {
      type: "widget",
      backgroundColor: T.widgetBg,
      padding: 12,
      children: smallChildren
    };
  }

  /**
   * ======================================
   * 👑 中号 (Medium) 与大号 (Large)
   * ======================================
   */
  const headerRow = {
    type: "stack", direction: "row", alignItems: "center",
    children: [
      { type: "spacer", length: 4 },
      { type: "text", text: "🏆", font: { size: 15 } },
      { type: "spacer", length: 6 },
      { type: "text", text: "世界杯赛程", font: { size: 16, weight: "bold" }, textColor: T.teamName },
      { type: "spacer" },
      { type: "text", text: updateStr, font: { size: 11 }, textColor: T.updateTime },
      { type: "spacer", length: 8 }
    ]
  };

  let activeDayConfigs = [];
  let widgetChildren   = [];

  if (family === "medium") {
    activeDayConfigs = dayConfigMedium;
    widgetChildren = [
      { type: "spacer", length: 2 },
      headerRow,
      { type: "spacer", length: 3 }
    ];
  } else {
    activeDayConfigs = dayConfigLarge;
    widgetChildren = [
      { type: "spacer", length: 2 },
      headerRow,
      { type: "spacer", length: 6 }
    ];
  }

  if (!fetchSuccess) {
    widgetChildren.push({
      type: "text", text: "⚠️ 数据拉取失败，请检查网络。",
      textColor: "#FF3B30", font: { size: 14 }
    });
    widgetChildren.push({ type: "spacer" });
    return { type: "widget", backgroundColor: T.widgetBg, padding: 12, children: widgetChildren };
  }

  for (let dIndex = 0; dIndex < activeDayConfigs.length; dIndex++) {
    const cfg        = activeDayConfigs[dIndex];
    const dayMatches = groupedMatches[cfg.key];

    if (dayMatches.length === 0 && cfg.key !== "今天") continue;

    const count      = dayMatches.length;
    const dateLabel  = `${String(cfg.month).padStart(2,'0')}/${String(cfg.date).padStart(2,'0')}`;
    const countLabel = `${count}场`;

    const leftColumn = {
      type: "stack", direction: "column", alignItems: "center",
      width: COL_WIDTH_LEFT,
      children: [
        { type: "text", text: cfg.label,  font: { size: 13, weight: "bold" }, textColor: cfg.labelColor },
        { type: "spacer", length: 4 },
        { type: "text", text: dateLabel,  font: { size: 10, weight: "medium" }, textColor: cfg.dateColor },
        { type: "spacer", length: 2 },
        { type: "text", text: countLabel, font: { size: 10 }, textColor: cfg.dateColor },
      ]
    };

    let matchRows = [];
    if (dayMatches.length === 0) {
      matchRows.push({
        type: "text", text: "当天暂无赛事",
        font: { size: 12 }, textColor: T.noMatch
      });
    }

    for (let i = 0; i < dayMatches.length; i++) {
      const m = dayMatches[i];

      const homeName  = translateTeam(m.home.team.name || m.home.team.shortDisplayName, true);
      const awayName  = translateTeam(m.away.team.name || m.away.team.shortDisplayName, false);
      const nameColor = T.teamName;

      let statusColor = T.statusPending;
      let statusFont  = { size: 10 };
      if (m.status === "post") {
        statusColor = T.statusFinished;
      } else if (m.status === "in") {
        statusColor = T.statusLive;
        statusFont  = { size: 10, weight: "semibold" };
      }

      let scoreStr   = "vs";
      let scoreColor = T.vs;
      let scoreFont  = { size: 12, weight: "medium" };
      if (m.status === "post") {
        scoreStr   = `${m.home.score}-${m.away.score}`;
        scoreColor = T.scoreFinished;
        scoreFont  = { size: 12, weight: "bold" };
      } else if (m.status === "in") {
        scoreStr   = `${m.home.score}-${m.away.score}`;
        scoreColor = T.scoreLive;
        scoreFont  = { size: 12, weight: "bold" };
      }

      const row = {
        type: "stack", direction: "row", alignItems: "center",
        children: [
          {
            type: "stack", direction: "row", width: COL_WIDTH_TIME,
            children: [
              { type: "text", text: m.time, font: { size: 11 }, textColor: T.matchTime },
              { type: "spacer" }
            ]
          },
          {
            type: "stack", direction: "row", width: COL_WIDTH_STATUS,
            children: [
              { type: "text", text: m.statusText, font: statusFont, textColor: statusColor },
              { type: "spacer" }
            ]
          },
          {
            type: "stack", direction: "row", width: COL_WIDTH_TEAM,
            children: [
              { type: "spacer" },
              { type: "text", text: homeName, font: { size: 11.5, weight: "medium" }, textColor: nameColor }
            ]
          },
          {
            type: "stack", direction: "row", width: COL_WIDTH_SCORE,
            children: [
              { type: "spacer" },
              { type: "text", text: scoreStr, font: scoreFont, textColor: scoreColor },
              { type: "spacer" }
            ]
          },
          {
            type: "stack", direction: "row", width: COL_WIDTH_TEAM,
            children: [
              { type: "text", text: awayName, font: { size: 11.5, weight: "medium" }, textColor: nameColor },
              { type: "spacer" }
            ]
          }
        ]
      };

      matchRows.push(row);

      if (i < dayMatches.length - 1) {
        matchRows.push({ type: "spacer", length: family === "large" ? 8 : 5 });
      }
    }

    const rightColumn = {
      type: "stack", direction: "column",
      children: matchRows
    };

    const cardContentRow = {
      type: "stack", direction: "row", alignItems: "center",
      children: [
        leftColumn,
        { type: "spacer", length: 6 },
        rightColumn
      ]
    };

    const containerConfig = {
      type: "stack", direction: "column",
      cornerRadius:  CARD_CORNER_RADIUS,
      borderRadius:  CARD_CORNER_RADIUS,
      clipToBounds:  true,
      masksToBounds: true,
      padding:       8,
      children: [cardContentRow]
    };

    if (family === "large" && cfg.cardBg) {
      containerConfig.backgroundColor = cfg.cardBg;
    }

    widgetChildren.push(containerConfig);

    if (family === "large" && dIndex < activeDayConfigs.length - 1) {
      widgetChildren.push({ type: "spacer", length: 8 });
    }
  }

  widgetChildren.push({ type: "spacer" });

  return {
    type: "widget",
    backgroundColor: T.widgetBg,
    padding: 12,
    children: widgetChildren
  };
}
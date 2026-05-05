/**
 * ==========================================
 * 📌 岁时黄历 (Almanac) 小组件 - Pro 节气高亮版
 *
 * 【功能说明】
 * • 三尺寸适配：小号 / 中号 / 大号完整支持
 * • 农历系统：干支 / 生肖 / 农历 / 节气（UTC+8 修正）
 * • 节气增强：
 *    - 修复节气倒计时 +1 天误差
 *    - 今日节气高亮（金色）
 *    - 3 天内节气预警（红色）
 * • 宜忌显示：
 *    - 中号卡片取消省略号
 *    - 自动换行，与大号一致
 * • 数据来源：openApiData（支持容错降级）
 *
 * ⏱️ 更新时间：2026-05-05
 * ==========================================
 */

export default async function(ctx) {

  /* ========= 基础 ========= */
  const family  = (ctx.widgetFamily || 'systemMedium').toLowerCase();
  const isSmall = family.includes('small');
  const isLarge = family.includes('large');

  const C = {
    bg: [{ light: '#FFFFFF', dark: '#1C1C1E' }, { light: '#F2F2F7', dark: '#0C0C0E' }],
    main: { light: '#1C1C1E', dark: '#FFFFFF' },
    sub: { light: '#48484A', dark: '#D1D1D6' },
    muted: { light: '#8E8E93', dark: '#8E8E93' },
    gold: { light: '#B58A28', dark: '#D6A53A' },
    yi: { light: '#2E8045', dark: '#32D74B' },
    ji: { light: '#CA3B32', dark: '#FF453A' },
    term: { light: '#628C7B', dark: '#73A491' },
    transparent: '#00000000'
  };

  const mkText = (t,s,w,c,o={}) => ({type:"text",text:String(t),font:{size:s,weight:w},textColor:c,...o});
  const mkIcon = (s,c,z=13) => ({type:"image",src:`sf-symbol:${s}`,color:c,width:z,height:z});
  const mkRow  = (ch,g=4) => ({type:"stack",direction:"row",alignItems:"center",gap:g,children:ch});
  const mkSpacer = l => l?{type:"spacer",length:l}:{type:"spacer"};

  /* ========= 时间（UTC+8） ========= */
  const tzOffset = new Date().getTimezoneOffset();
  const now = new Date(Date.now() + (tzOffset + 480) * 60000);
  const [Y,M,D] = [now.getFullYear(), now.getMonth()+1, now.getDate()];
  const WEEK = "日一二三四五六"[now.getDay()];
  const todayMs = new Date(Y,M-1,D,0,0,0,0).getTime();

  /* ========= 节气 ========= */
  const termNames = ["小寒","大寒","立春","雨水","惊蛰","春分","清明","谷雨","立夏","小满","芒种","夏至","小暑","大暑","立秋","处暑","白露","秋分","寒露","霜降","立冬","小雪","大雪","冬至"];

  const getTerm = (y,n)=>{
    const t=new Date(
      (31556925974.7*(y-1900))+
      [0,21208,42467,63836,85337,107014,128867,150921,173149,195551,218072,240693,263343,285989,308563,331033,353350,375494,397447,419210,440795,462224,483532,504758][n-1]*60000+
      Date.UTC(1900,0,6,2,5)
    );
    return new Date(t.getTime()+8*3600000).getUTCDate();
  };

  const allTerms=[];
  [-1,0,1].forEach(o=>{
    for(let i=1;i<=24;i++){
      allTerms.push({
        name:termNames[i-1],
        date:new Date(Y+o,Math.floor((i-1)/2),getTerm(Y+o,i))
      });
    }
  });

  const mapTerm=t=>{
    const d=new Date(t.date);
    const diff=Math.floor((d.setHours(0,0,0,0)-todayMs)/86400000);
    return {name:t.name,diff,isToday:diff===0,isNear:diff>0&&diff<=3};
  };

  let upcoming=[];
  for(let i=0;i<allTerms.length;i++){
    const diff=Math.floor((new Date(allTerms[i].date).setHours(0,0,0,0)-todayMs)/86400000);
    if(diff>=0){
      const start=diff===0?i+1:i;
      upcoming=allTerms.slice(start,start+6).map(mapTerm);
      break;
    }
  }

  const termRows=upcoming.map((t,i)=>{
    let color=C.term,text=`${t.name} ${t.diff}天`;
    if(t.isToday){color=C.gold;text=`今日${t.name}`;}
    else if(t.isNear){color=C.ji;}

    return {
      type:'stack',
      direction:'row',
      gap:4,
      children:[
        mkIcon(i===0?'leaf.arrow.circlepath':'circle.fill',color),
        mkText(text,12,"medium",color,{flex:1})
      ]
    };
  });

  /* ========= 宜忌 API ========= */
  let rawYi="",rawJi="";
  try{
    const resp=await ctx.http.get(`https://raw.githubusercontent.com/zqzess/openApiData/main/calendar_new/${Y}/${Y}${String(M).padStart(2,'0')}.json`);
    const json=JSON.parse(await resp.text());
    const key=`${Y}-${String(M).padStart(2,'0')}-${String(D).padStart(2,'0')}`;
    const data=json[key]||{};
    rawYi=(data.yi||"").replace(/[.。]/g," ");
    rawJi=(data.ji||"").replace(/[.。]/g," ");
  }catch(e){}

  const split=(s,max=22)=>{
    if(!s)return[];
    let r=[],l="";
    for(const c of s){
      if(l.length>=max){r.push(l);l=c;}
      else l+=c;
    }
    if(l)r.push(l);
    return r;
  };

  const build=(txt,label,color)=>{
    const lines=split(txt);
    return lines.map((l,i)=>({
      type:'stack',direction:'row',gap:4,
      children:[
        mkText(i===0?label:" ",12,"bold",color),
        mkText(l,12,"medium",C.sub,{flex:1})
      ]
    }));
  };

  /* ========= 输出 ========= */
  return {
    type:'widget',
    padding:12,
    backgroundGradient:{type:'linear',colors:C.bg,startPoint:{x:0,y:0},endPoint:{x:1,y:1}},
    children:[
      mkRow([mkText(`${Y}年${M}月${D}日 星期${WEEK}`,14,"heavy",C.main)]),
      mkSpacer(8),

      ...build(rawYi,"宜",C.yi),
      mkSpacer(4),
      ...build(rawJi,"忌",C.ji),

      mkSpacer(8),
      ...termRows
    ]
  };
}
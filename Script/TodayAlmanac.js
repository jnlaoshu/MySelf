/*
 * 今日黄历&节假日倒数（含成都义教段学校特定日期）
 * 𝐔𝐑𝐋： https://raw.githubusercontent.com/jnlaoshu/MySelf/refs/heads/main/Script/TodayAlmanac.js
 * 更新：2026.01.16 21:35
 */

(async () => {
  const now = new Date();
  const curYear = now.getFullYear();
  const curMonth = now.getMonth() + 1;
  const curDate = now.getDate();
  const weekCn = "日一二三四五六";
  const $store = typeof $persistentStore !== "undefined" ? $persistentStore : null;
  const hasNotify = typeof $notification !== "undefined";
  const hasHttpClient = typeof $httpClient !== "undefined";

  // 工具函数
  const padStart2 = n => n.toString().padStart(2, '0');
  const formatYmd = (y, m, d) => `${y}-${padStart2(m)}-${padStart2(d)}`;
  const args = typeof $argument !== "undefined" ? Object.fromEntries(new URLSearchParams($argument.replace(/,/g, '&'))) : {};
  const getConfig = (k, d) => ["true", "1", "yes"].includes(args[k] ?? args[k.toLowerCase()] ?? "") || d;
  const httpGet = url => new Promise(resolve => hasHttpClient && $httpClient.get({url, timeout:5000}, (e, r, d) => resolve(!e && r?.status===200 ? d : null)));
  const fetchJson = async (u, f={}) => u ? await httpGet(u).then(d => d ? JSON.parse(d) : f).catch(() => f) : f;
  const calcDateDiff = ds => {
    const [y, m, d] = ds.split('-').map(Number);
    return Math.floor((new Date(y, m-1, d).getTime() - now.getTime()) / 86400000);
  };

  // 农历核心转换算法
  const LunarCal = {
    lInfo:[0x04bd8,0x04ae0,0x0a570,0x054d5,0x0d260,0x0d950,0x16554,0x056a0,0x09ad0,0x055d2,0x04ae0,0x0a5b6,0x0a4d0,0x0d250,0x1d255,0x0b540,0x0d6a0,0x0ada2,0x095b0,0x14977,0x04970,0x0a4b0,0x0b4b5,0x06a50,0x06d40,0x1ab54,0x02b60,0x09570,0x052f2,0x04970,0x06566,0x0d4a0,0x0ea50,0x16a95,0x05ad0,0x02b60,0x186e3,0x092e0,0x1c8d7,0x0c950,0x0d4a0,0x1d8a6,0x0b550,0x056a0,0x1a5b4,0x025d0,0x092d0,0x0d2b2,0x0a950,0x0b557,0x06ca0,0x0b550,0x15355,0x04da0,0x0a5b0,0x14573,0x052b0,0x0a9a8,0x0e950,0x06aa0,0x0aea6,0x0ab50,0x04b60,0x0aae4,0x0a570,0x05260,0x0f263,0x0d950,0x05b57,0x056a0,0x096d0,0x04dd5,0x04ad0,0x0a4d0,0x0d4d4,0x0d250,0x0d558,0x0b540,0x0b6a0,0x195a6,0x095b0,0x049b0,0x0a974,0x0a4b0,0x0b27a,0x06a50,0x06d40,0x0af46,0x0ab60,0x09570,0x04af5,0x04970,0x064b0,0x074a3,0x0ea50,0x06b58,0x05ac0,0x0ab60,0x096d5,0x092e0,0x0c960,0x0d954,0x0d4a0,0x0da50,0x07552,0x056a0,0x0abb7,0x025d0,0x092d0,0x0cab5,0x0a950,0x0b4a0,0x0baa4,0x0ad50,0x055d9,0x04ba0,0x0a5b0,0x15176,0x052b0,0x0a930,0x07954,0x06aa0,0x0ad50,0x05b52,0x04b60,0x0a6e6,0x0a4e0,0x0d260,0x0ea65,0x0d530,0x05aa0,0x076a3,0x096d0,0x04afb,0x04ad0,0x0a4d0,0x1d0b6,0x0d250,0x0d520,0x0dd45,0x0b5a0,0x056d0,0x055b2,0x049b0,0x0a577,0x0a4b0,0x0aa50,0x1b255,0x06d20,0x0ada0,0x14b63,0x09370,0x049f8,0x04970,0x064b0,0x168a6,0x0ea50,0x06b20,0x1a6c4,0x0aae0,0x092e0,0x0d2e3,0x0c960,0x0d557,0x0d4a0,0x0da50,0x05d55,0x056a0,0x0a6d0,0x055d4,0x052d0,0x0a9b8,0x0a950,0x0b4a0,0x0b6a6,0x0ad50,0x055a0,0x0aba4,0x0a5b0,0x052b0,0x0b273,0x06930,0x07337,0x06aa0,0x0ad50,0x14b55,0x04b60,0x0a570,0x054e4,0x0d160,0x0e968,0x0d520,0x0daa0,0x16aa6,0x056d0,0x04ae0,0x0a9d4,0x0a2d0,0x0d150,0x0f252,0x0d520],
    sTermInfo:['9778397bd097c36b0b6fc9274c91aa','97b6b97bd19801ec9210c965cc920e','97bcf97c359801ec95f8c965cc920f','97bd0b06bdb0722c965ce1cfcc920f','b027097bd097c36b0b6fc9274c91aa','97b6b97bd19801ec9210c965cc920e','97bcf97c359801ec95f8c965cc920f','97bd0b06bdb0722c965ce1cfcc920f','b027097bd097c36b0b6fc9274c91aa','97b6b97bd19801ec9210c965cc920e','97bcf97c359801ec95f8c965cc920f','97bd0b06bdb0722c965ce1cfcc920f','b027097bd097c36b0b6fc9274c91aa','9778397bd19801ec9210c965cc920e','97b6b97bd19801ec95f8c965cc920f','97bd09801d98082c95f8e1cfcc920f','97bd097bd097c36b0b6fc9210c8dc2','9778397bd197c36c9210c9274c91aa','97b6b97bd19801ec95f8c965cc920e','97bd09801d98082c95f8e1cfcc920f','97bd097bd097c36b0b6fc9210c8dc2','9778397bd097c36b0b6fc9274c91aa','97b6b97bd19801ec95f8c965cc920e','97bcf97c3598082c95f8e1cfcc920f','97bd097bd097c36b0b6fc9210c8dc2','9778397bd097c36b0b6fc9274c91aa','97b6b97bd19801ec9210c965cc920e','97bcf97c3598082c95f8c965cc920f','97bd097bd097c35b0b6fc920fb0722','9778397bd097c36b0b6fc9274c91aa','97b6b97bd19801ec9210c965cc920e','97bcf97c3598082c95f8c965cc920f','97bd097bd097c35b0b6fc920fb0722','9778397bd097c36b0b6fc9274c91aa','97b6b97bd19801ec9210c965cc920e','97bcf97c359801ec95f8c965cc920f','97bd097bd097c35b0b6fc920fb0722','9778397bd097c36b0b6fc9274c91aa','97b6b97bd19801ec9210c965cc920e','97bcf97c359801ec95f8c965cc920f','97bd097bd07f595b0b6fc920fb0722','9778397bd097c36b0b6fc9210c8dc2','9778397bd19801ec9210c9274c920e','97b6b97bd19801ec95f8c965cc920f','97bd07f5307f595b0b0bc920fb0722','7f0e397bd097c36b0b6fc9210c8dc2'],
    terms:["小寒","大寒","立春","雨水","惊蛰","春分","清明","谷雨","立夏","小满","芒种","夏至","小暑","大暑","立秋","处暑","白露","秋分","寒露","霜降","立冬","小雪","大雪","冬至"],
    Gan:"甲乙丙丁戊己庚辛壬癸",Zhi:"子丑寅卯辰巳午未申酉戌亥",Animals:"鼠牛虎兔龙蛇马羊猴鸡狗猪",
    nStr1:"日一二三四五六七八九十",nStr2:["初","十","廿","卅"],nStr3:["正","二","三","四","五","六","七","八","九","十","冬","腊"],
    lYearDays(y){let i,s=348;for(i=0x8000;i>0x8;i>>=1)s+=this.lInfo[y-1900]&i?1:0;return s+this.leapDays(y);},
    leapMonth(y){return this.lInfo[y-1900]&0xf;},leapDays(y){return this.leapMonth(y)?(this.lInfo[y-1900]&0x10000)?30:29:0;},
    monthDays(y,m){return this.lInfo[y-1900]&(0x10000>>m)?30:29;},
    solarDays(y,m){return m===2?(y%4===0&&y%100!==0||y%400===0?29:28):[31,28,31,30,31,30,31,31,30,31,30,31][m-1];},
    getTerm(y,n){const t=this.sTermInfo[y-1900],d=[];for(let i=0;i<t.length;i+=5){const c=parseInt('0x'+t.substr(i,5)).toString();d.push(c[0],c.substr(1,2),c[3],c.substr(4,2));}return parseInt(d[n-1]);},
    toChinaDay(d){if(d===10)return"初十";if(d===20)return"二十";if(d===30)return"三十";return this.nStr2[Math.floor(d/10)]+this.nStr1[d%10];},
    getAnimal(y){return this.Animals[(y-4)%12];},toGanZhi(o){return this.Gan[o%10]+this.Zhi[o%12];},
    solar2lunar(y,m,d){
      let i,l=0,t=0,o=(Date.UTC(y,m-1,d)-Date.UTC(1900,0,31))/86400000;
      for(i=1900;i<2101&&o>0;i++){t=this.lYearDays(i);o-=t;}
      if(o<0){o+=t;i--;}const yr=i;let isL=false;l=this.leapMonth(i);
      for(i=1;i<13&&o>0;i++){if(l>0&&i===l+1&&!isL){i--;isL=true;t=this.leapDays(yr);}else{t=this.monthDays(yr,i);}if(isL&&i===l+1)isL=false;o-=t;}
      if(o===0&&l>0&&i===l+1){if(isL)isL=false;else{isL=true;i--;}}if(o<0){o+=t;i--;}
      const mo=i,dy=o+1,ti=this.getTerm(y,m*2-1)===d?m*2-2:this.getTerm(y,m*2)===d?m*2-1:null;
      return {
        lYear:yr,lMonth:mo,lDay:dy,animal:this.getAnimal(yr),
        monthCn:(l===mo&&isL?"闰":"")+this.nStr3[mo-1]+"月",dayCn:this.toChinaDay(dy),
        gzYear:this.toGanZhi(yr-4),term:ti!==null?this.terms[ti]:null,
        astro:"摩羯水瓶双鱼白羊金牛双子巨蟹狮子处女天秤天蝎射手摩羯".substr(m*2-(d<[20,19,21,21,21,22,23,23,23,23,22,22][m-1]?2:0),2)+"座"
      };
    }
  };

  // 节日数据生成
  const generateFestData = y => {
    const eve = LunarCal.monthDays(y,12)===29?29:30;
    const l2s = (m,d)=>{const r=LunarCal.lunar2solar(y,m,d);return formatYmd(r.y,r.m,r.d);};
    const wsd = (m,n,w)=>{const d=new Date(y,m-1,1);const dy=1+((w-d.getDay()+7)%7)+(n-1)*7;return formatYmd(y,m,Math.min(dy,31));};
    const qd = LunarCal.getTerm(y,7);
    return {
      legal:[["元旦",formatYmd(y,1,1)],["寒假",formatYmd(y,1,31)],["春节",l2s(1,1)],["开学",formatYmd(y,3,2)],["清明节",formatYmd(y,4,qd)],["春假",formatYmd(y,4,qd+1)],["劳动节",formatYmd(y,5,1)],["端午节",l2s(5,5)],["高考",formatYmd(y,6,7)],["暑假",formatYmd(y,7,4)],["中秋节",l2s(8,15)],["国庆节",formatYmd(y,10,1)]],
      folk:[["元宵节",l2s(1,15)],["龙抬头",l2s(2,2)],["七夕节",l2s(7,7)],["中元节",l2s(7,15)],["重阳节",l2s(9,9)],["腊八节",l2s(12,8)],["小年",l2s(12,23)],["除夕",l2s(12,eve)]],
      intl:[["情人节",formatYmd(y,2,14)],["母亲节",wsd(5,2,0)],["父亲节",wsd(6,3,0)],["万圣节",formatYmd(y,10,31)],["圣诞节",formatYmd(y,12,25)]],
      term:Array.from({length:24},(_,i)=>{const m=Math.floor(i/2)+1;return [LunarCal.terms[i],formatYmd(y,m,LunarCal.getTerm(y,i+1))];})
    };
  };

  // 黄历宜忌获取
  const getAlmanac = async () => {
    if(!getConfig('show_almanac',true)) return "";
    const res = await fetchJson(`https://raw.githubusercontent.com/zqzess/openApiData/main/calendar/${curYear}/${curYear}${padStart2(curMonth)}.json`);
    const item = res?.data?.[0]?.almanac?.find(i=>Number(i.day)===curDate) || {};
    const desc = [item.desc,item.term,item.value].filter(Boolean).join(" ");
    return `${desc}\n✅ 宜：${item.suit||"诸事皆宜"}\n❎ 忌：${item.avoid||"无特殊禁忌"}`.trim();
  };

  // 公共方法
  const mergeFest = (t,l) => [...generateFestData(curYear)[t],...generateFestData(curYear+1)[t]].filter(i=>calcDateDiff(i[1])>=0).slice(0,l);
  const renderFest = list => list.map(([n,d])=>calcDateDiff(d)===0?`🎉${n}`:`${n} ${calcDateDiff(d)}天`).join(" , ");
  const getTodayFest = list => list.find(([_,d])=>calcDateDiff(d)===0);

  // 主逻辑
  const lunar = LunarCal.solar2lunar(curYear, curMonth, curDate);
  const header = `${lunar.gzYear}(${lunar.animal})年 ${lunar.monthCn}${lunar.dayCn} ${lunar.term||""}`.trim();
  const almanac = await getAlmanac();
  const bless = await fetchJson(args.BLESS_URL,{});

  const legal = mergeFest("legal",3), folk=mergeFest("folk",3), intl=mergeFest("intl",3), term=mergeFest("term",4);
  if(hasNotify && $store && now.getHours()>=6){
    const fest = getTodayFest(legal) || getTodayFest(folk);
    if(fest){
      const [n,d] = fest; const ck = `tc_${d}`;
      if($store.read(ck)!=='1'){$store.write('1',ck);$notification.post(`🎉 今日${n}`, '', bless[n]||"节日快乐～");}
    }
  }

  const title = `${curYear}年${padStart2(curMonth)}月${padStart2(curDate)}日 星期${weekCn[now.getDay()]} ${lunar.astro}`;
  const content = [header,almanac,[renderFest(legal),renderFest(term),renderFest(folk),renderFest(intl)].filter(Boolean).join("\n")].filter(Boolean).join("\n\n");
  
  $done({title,content,icon:"calendar","icon-color":"#FF9800"});
})().catch(e=>$done({title:"加载失败",content:`错误：${e.message}`,icon:"exclamationmark.triangle"}));

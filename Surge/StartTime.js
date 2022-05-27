// Surge启动时长面板𝐔𝐑𝐋：https://raw.githubusercontent.com/jnlaoshu/MySelf/master/Surge/StartTime.js
// 𝐅𝐫𝐨𝐦：https://raw.githubusercontent.com/tcqgg2018/surge/main/function_timeTransform.js
// 𝐔𝐩𝐝𝐚𝐭𝐞：2022.05.27 08:30

/*
[Script]
启动时长 = type=generic,timeout=10,script-path=https://raw.githubusercontent.com/jnlaoshu/MySelf/master/Surge/StartTime.js,argument=icon=power.circle&color=#FF2121&title=𝕊𝕦𝕣𝕘𝕖ℙ𝕣𝕠
  对应参数：
	icon：图标
	color：图标颜色
	title：显示名称
	
[Panel]
启动时长 = script-name=启动时长,title=启动时长,content=请刷新,update-interval=1
*/

!(async () => {
let traffic = (await httpAPI("/v1/traffic","GET"));
let dateNow = new Date();
let dateTime = Math.floor(traffic.startTime*1000);
let startTime = timeTransform(dateNow,dateTime);
let mitm_status = (await httpAPI("/v1/features/mitm","GET"));
let rewrite_status = (await httpAPI("/v1/features/rewrite","GET"));
let scripting_status = (await httpAPI("/v1/features/scripting","GET"));
let icon_s = mitm_status.enabled&&rewrite_status.enabled&&scripting_status.enabled;
//点击按钮，刷新dns
//if ($trigger == "button") await httpAPI("/v1/dns/flush");
//点击按钮，重载配置（同时刷新dns）

Date.prototype.Format = function (fmt) {
    var o = {
        "M+": this.getMonth() + 1, 
        "d+": this.getDate(), 
        "H+": this.getHours(), 
        "m+": this.getMinutes(),
        "s+": this.getSeconds(), 
        "q+": Math.floor((this.getMonth() + 3) / 3), 
        "S": this.getMilliseconds() 
    };
    if (/(y+)/.test(fmt)) fmt = fmt.replace(RegExp.$1, (this.getFullYear() + "").substr(4 - RegExp.$1.length));
    for (var k in o)
    if (new RegExp("(" + k + ")").test(fmt)) fmt = fmt.replace(RegExp.$1, (RegExp.$1.length == 1) ? (o[k]) : (("00" + o[k]).substr(("" + o[k]).length)));
    return fmt;
}

if ($trigger == "button") {
	await httpAPI("/v1/profiles/reload");
	$notification.post("配置重载","配置重载成功","")
};
$done({
    title:"Surge👑Pro™ ",
    content: "北京时间："+ (new Date()).Format("yyyy-MM-dd HH:mm:ss")+"\n启动时长："+startTime + "\nMitm:"+icon_status(mitm_status.enabled)+"  Rewrite:"+icon_status(rewrite_status.enabled)+"  Scripting:"+icon_status(scripting_status.enabled),
    icon: icon_s?"crown.fill":"exclamationmark.triangle",
   "icon-color":icon_s?"#EACD76":"#F20C00"
});
})();
function icon_status(status){
  if (status){
    return "\u2611";
  } else {
      return "\u2612"
    }
}
function timeTransform(dateNow,dateTime) {
let dateDiff = dateNow - dateTime;
let days = Math.floor(dateDiff / (24 * 3600 * 1000));//计算出相差天数
let leave1=dateDiff%(24*3600*1000)    //计算天数后剩余的毫秒数
let hours=Math.floor(leave1/(3600*1000))//计算出小时数
//计算相差分钟数
let leave2=leave1%(3600*1000)    //计算小时数后剩余的毫秒数
let minutes=Math.floor(leave2/(60*1000))//计算相差分钟数
//计算相差秒数
let leave3=leave2%(60*1000)      //计算分钟数后剩余的毫秒数
let seconds=Math.round(leave3/1000)

if(days==0){
  if(hours==0){
    if(minutes==0)return(`${seconds}秒`);
      return(`${minutes}分${seconds}秒`)
    }
    return(`${hours}时${minutes}分${seconds}秒`)
  }else {
        return(`${days}天${hours}时${minutes}分`)
	}
}
function httpAPI(path = "", method = "POST", body = null) {
  return new Promise((resolve) => {
    $httpAPI(method, path, body, (result) => {
      resolve(result);
    });
  });
}

// Surge启动时长面板𝐔𝐑𝐋：https://raw.githubusercontent.com/jnlaoshu/MySelf/master/Surge/StartTime.js
// 𝐅𝐫𝐨𝐦：https://github.com/smartmimi/conf/blob/master/surge/functionstatus.js
// 𝐔𝐩𝐝𝐚𝐭𝐞：2022.11.25 17:50

/*
[Script]
运行时长 = type=generic,timeout=10,script-path=https://raw.githubusercontent.com/jnlaoshu/MySelf/master/Surge/StartTime.js
  对应参数：
	icon：图标
	color：图标颜色
	title：显示名称
	
[Panel]
运行时长 = script-name=运行时长,title=运行时长,content=请刷新,update-interval=1
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
if ($trigger == "button") {
	await httpAPI("/v1/profiles/reload");
	$notification.post("配置重载","配置重载成功","")
};
$done({
    title:"SurgePro | 2023-04-07",
    content: "运行时长："+startTime + "\n𝐌𝐢𝐭𝐌"+icon_status(mitm_status.enabled)+"   𝐑𝐞𝐰𝐫𝐢𝐭𝐞"+icon_status(rewrite_status.enabled)+"   𝐒𝐜𝐫𝐢𝐩𝐭𝐢𝐧𝐠"+icon_status(scripting_status.enabled),
    icon: icon_s?"power.circle":"exclamationmark.triangle",
   "icon-color":icon_s?"#FF2121":"#F20C00"
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

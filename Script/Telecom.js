 // 中国电信Telecom流量信息
 // 𝐔𝐑𝐋： https://raw.githubusercontent.com/jnlaoshu/MySelf/main/Script/Telecom.js
 // 𝐅𝐫𝐨𝐦：https://github.com/mieqq/mieqq/blob/master/telecom.js
 // 𝐔𝐩𝐝𝐚𝐭𝐞：2022.10.21 10:00
 
/*
#先从网页登陆一下：e.189.cn
#再访问： https://e.189.cn/store/user/package_detail.do

==================【Surge】============
[Script]
Telecom = type=http-request,script-path=https://raw.githubusercontent.com/jnlaoshu/MySelf/main/Script/Telecom.js,pattern=https://e.189.cn/store/user/package_detail.do,requires-body=1,max-size=0,timeout=10

[Panel]
Telecom = script-name=Telecom,update-interval=3600

[MITM]
hostname = %APPEND% e.189.cn:443
*/

const url = "https://e.189.cn/store/user/package_detail.do";
const url2 = "https://e.189.cn/store/user/balance_new.do";

(async () => {
  if (typeof $request != "undefined") {
    saveRequest();
    $done({});
    return;
  }

  let request = JSON.parse($persistentStore.read("telecom"));
    let usage = await Request(url, "post", request.headers, request.body);
    let balance = await Request(url2, "post", request.headers, request.body);
  
  if (!usage || !balance  || (usage.result < 0)) $done();
  let total = usage.total * 1024;
  let used = usage.used * 1024;
  let fee = balance.totalBalanceAvailable;
  let voice = usage.voiceBalance;
  let args = getArgs();
  $done({
    title: `${args.title || "中国电信"} | ${getTime()}`,
    content: `共享流量：${bytesToSize(used)} | ${bytesToSize(total)}\n账户余额：${
      fee / 100
    } 元\n剩余语音：${voice} 分钟`,
    icon: args.icon || "antenna.radiowaves.left.and.right.circle",
    "icon-color": args.color || "#5E5CDE",
  });
})();

function Request(url, method = "get", headers, body) {
  let request = {
    url: url,
    headers: headers,
    body: body
  }
  return new Promise((resolve, reject) => {
    $httpClient[method](request, (err, resp, data) => {
      if (err != null) {
        reject(err);
        return;
      }
      if (resp.status !== 200) {
        reject("Not Available");
        return;
      }
      resolve(JSON.parse(data));
    });
  });
}

function bytesToSize(bytes) {
  if (bytes === 0) return "0B";
  let k = 1024;
  sizes = ["B", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];
  let i = Math.floor(Math.log(bytes) / Math.log(k));
  return (bytes / Math.pow(k, i)).toFixed(2) + " " + sizes[i];
}

function saveRequest() {
  let headers = $request.headers;
  delete headers.Connection;
  let request = {
    url: "",
    headers: headers,
    body: $request.body,
  };
  $persistentStore.write(JSON.stringify(request), "telecom");
  $notification.post("Done", "成功保存请求信息", "");
}

function getTime () {
  let now = new Date();
  let hour = now.getHours();
  let minutes = now.getMinutes();
  hour = hour > 9 ? hour : "0" + hour;
  minutes = minutes > 9 ? minutes : "0" + minutes;
  return `${hour}:${minutes}`
}

function getArgs() {
  if (typeof $argument == "undefined") {
    return {};
  } 
  return Object.fromEntries(
    $argument
      .split("&")
      .map((item) => item.split("="))
      .map(([k, v]) => [k, decodeURIComponent(v)])
  );
}

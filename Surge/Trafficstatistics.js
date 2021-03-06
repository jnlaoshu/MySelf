// æµéç»è®¡ðððï¼ https://raw.githubusercontent.com/jnlaoshu/MySelf/master/Surge/Trafficstatistics.js
// ðð«ð¨ð¦ï¼https://raw.githubusercontent.com/fishingworld/something/main/PanelScripts/trafficstatistics.js
// ðð©ððð­ðï¼2022.05.27 14:00

/*
[Script]
æµéç»è®¡ = type=generic,timeout=10,script-path=https://raw.githubusercontent.com/jnlaoshu/MySelf/master/Surge/Trafficstatistics.js,argument=icon=arrow.up.arrow.down.circle&color=#5d84f8
  å¯¹åºåæ°ï¼
    iconï¼å¾æ 
    colorï¼å¾æ é¢è²
	
[Panel]
æµéç»è®¡ = script-name=æµéç»è®¡,title=æµéç»è®¡,content=è¯·å·æ°,update-interval=1
*/

let params = getParams($argument)

;(async () => {

let traffic = (await httpAPI("/v1/traffic"))
let interface = traffic.interface

/* è·åææç½ç»çé¢ */
let allNet = [];
for (var key in interface){
   allNet.push(key)
    }

if(allNet.includes("lo0")==true){
del(allNet,"lo0")
}

let net;
let index;
if( $persistentStore.read("NETWORK")==null||allNet.includes($persistentStore.read("NETWORK"))==false){
	index = 0
	}else{
	net = $persistentStore.read("NETWORK")
	for(let i = 0;i < allNet.length; ++i) {
		if(net==allNet[i]){
		index=i
		}
	}
}

/* æå¨æ§è¡æ¶åæ¢ç½ç»çé¢ */
if($trigger == "button"){
	if(allNet.length>1) index += 1
	if(index>=allNet.length) index = 0;
	$persistentStore.write(allNet[index],"NETWORK")
};

net = allNet[index]
let network = interface[net]

let outCurrentSpeed = speedTransform(network.outCurrentSpeed) //ä¸ä¼ éåº¦
let outMaxSpeed = speedTransform(network.outMaxSpeed) //æå¤§ä¸ä¼ éåº¦
let download = bytesToSize(network.in) //ä¸è½½æµé
let upload = bytesToSize(network.out) //ä¸ä¼ æµé
let inMaxSpeed = speedTransform(network.inMaxSpeed) //æå¤§ä¸è½½éåº¦
let inCurrentSpeed = speedTransform(network.inCurrentSpeed) //ä¸è½½éåº¦

/* å¤æ­ç½ç»ç±»å */
let netType;
if(net=="en0") {
	netType = "WiFi"
	}else{
	netType = "Cellular"
	}


  $done({
      title:"æµéç»è®¡ | "+netType,
      content:`æµéï¼${upload} | ${download}\n`+
      `éåº¦ï¼${outCurrentSpeed} | ${inCurrentSpeed}\n` +
		`å³°å¼ï¼${outMaxSpeed} | ${inMaxSpeed}`,
		icon: params.icon,
		  "icon-color":params.color
    });

})()

function bytesToSize(bytes) {
  if (bytes === 0) return "0B";
  let k = 1024;
  sizes = ["B", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];
  let i = Math.floor(Math.log(bytes) / Math.log(k));
  return (bytes / Math.pow(k, i)).toFixed(2) + " " + sizes[i];
}

function speedTransform(bytes) {
  if (bytes === 0) return "0B/s";
  let k = 1024;
  sizes = ["B/s", "KB/s", "MB/s", "GB/s", "TB/s", "PB/s", "EB/s", "ZB/s", "YB/s"];
  let i = Math.floor(Math.log(bytes) / Math.log(k));
  return (bytes / Math.pow(k, i)).toFixed(2) + " " + sizes[i];
}


function httpAPI(path = "", method = "GET", body = null) {
    return new Promise((resolve) => {
        $httpAPI(method, path, body, (result) => {
			
            resolve(result);
        });
    });
};


function getParams(param) {
  return Object.fromEntries(
    $argument
      .split("&")
      .map((item) => item.split("="))
      .map(([k, v]) => [k, decodeURIComponent(v)])
  );
}

function del(arr,num) {
			var l=arr.length;
		    for (var i = 0; i < l; i++) {
			  	if (arr[0]!==num) { 
			  		arr.push(arr[0]);
			  	}
			  	arr.shift(arr[0]);
		    }
		    return arr;
		}

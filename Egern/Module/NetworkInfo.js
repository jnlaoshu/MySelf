//# 网络信息
//# 𝐔𝐑𝐋： https://raw.githubusercontent.com/jnlaoshu/MySelf/master/Egern/Module/NetworkInfo.js
//# 𝐅𝐫𝐨𝐦：https://github.com/Nebulosa-Cat/Surge/blob/main/Panel/Network-Info/net-info-panel.js
//# 𝐔𝐩𝐝𝐚𝐭𝐞：2025.12.14 20:48

/*
[Script]
网络信息 = type=generic,timeout=10,script-path=https://raw.githubusercontent.com/jnlaoshu/MySelf/master/Egern/Module/NetworkInfo.js
	
[Panel]
网络信息 = script-name=网络信息,title=网络信息,content=请刷新,style=info,update-interval=1
*/

/**
 * 网络请求封装为 Promise
 */
class httpMethod {
  static _httpRequestCallback(resolve, reject, error, response, data) {
    if (error) {
      reject(error);
    } else {
      resolve(Object.assign(response, { data }));
    }
  }

  static get(option = {}) {
    return new Promise((resolve, reject) => {
      $httpClient.get(option, (error, response, data) => {
        this._httpRequestCallback(resolve, reject, error, response, data);
      });
    });
  }

  static post(option = {}) {
    return new Promise((resolve, reject) => {
      $httpClient.post(option, (error, response, data) => {
        this._httpRequestCallback(resolve, reject, error, response, data);
      });
    });
  }
}

class loggerUtil {
  constructor() {
    this.id = this.randomString();
  }

  randomString(e = 6) {
    var t = "ABCDEFGHJKMNPQRSTWXYZabcdefhijkmnprstwxyz2345678",
      a = t.length,
      n = "";
    for (let i = 0; i < e; i++) n += t.charAt(Math.floor(Math.random() * a));
    return n;
  }

  log(message) {
    console.log(`[${this.id}] [ LOG ] ${message}`);
  }

  error(message) {
    console.log(`[${this.id}] [ERROR] ${message}`);
  }
}

var logger = new loggerUtil();

function loadCarrierNames() {
  return {
    //台湾运营商 Taiwan
    '466-11': '中華電信', '466-92': '中華電信',
    '466-01': '遠傳電信', '466-03': '遠傳電信',
    '466-97': '台灣大哥大', '466-89': '台灣之星', '466-05': 'GT',
    //大陆运营商 China
    '460-03': '中国电信', '460-05': '中国电信', '460-11': '中国电信',
    '460-01': '中国联通', '460-06': '中国联通', '460-09': '中国联通',
    '460-00': '中国移动', '460-02': '中国移动', '460-04': '中国移动', '460-07': '中国移动', '460-08': '中国移动',
    '460-15': '中国广电', '460-20': '中移铁通',
    //香港运营商 HongKong
    '454-00': 'CSL', '454-02': 'CSL', '454-10': 'CSL', '454-18': 'CSL',
    '454-03': '3', '454-04': '3', '454-05': '3',
    '454-06': 'SMC HK', '454-15': 'SMC HK', '454-17': 'SMC HK',
    '454-09': 'CMHK', '454-12': 'CMHK', '454-13': 'CMHK', '454-28': 'CMHK', '454-31': 'CMHK',
    '454-16': 'csl.', '454-19': 'csl.', '454-20': 'csl.', '454-29': 'csl.',
    '454-01': '中信國際電訊', '454-07': 'UNICOM HK', '454-08': 'Truphone', '454-11': 'CHKTL', '454-23': 'Lycamobile',
    //日本运营商 Japan
    '440-00': 'Y!mobile', '440-10': 'docomo', '440-11': 'Rakuten', '440-20': 'SoftBank',
    '440-50': ' au', '440-51': ' au', '440-52': ' au', '440-53': ' au', '440-54': ' au',
    '441-00': 'WCP', '441-10': 'UQ WiMAX',
    //韩国运营商 Korea
    '450-03': 'SKT', '450-05': 'SKT',
    '450-02': 'KT', '450-04': 'KT', '450-08': 'KT',
    '450-06': 'LG U+', '450-10': 'LG U+',
    //美国运营商 USA
    '310-030': 'AT&T', '310-070': 'AT&T', '310-150': 'AT&T', '310-170': 'AT&T', '310-280': 'AT&T', '310-380': 'AT&T', '310-410': 'AT&T', '310-560': 'AT&T', '310-680': 'AT&T', '310-980': 'AT&T',
    '310-160': 'T-Mobile', '310-200': 'T-Mobile', '310-210': 'T-Mobile', '310-220': 'T-Mobile', '310-230': 'T-Mobile', '310-240': 'T-Mobile', '310-250': 'T-Mobile', '310-260': 'T-Mobile', '310-270': 'T-Mobile', '310-300': 'T-Mobile', '310-310': 'T-Mobile', '310-660': 'T-Mobile', '310-800': 'T-Mobile', '311-660': 'T-Mobile', '311-882': 'T-Mobile', '311-490': 'T-Mobile', '312-530': 'T-Mobile', '311-870': 'T-Mobile', '311-880': 'T-Mobile',
    '310-004': 'Verizon', '310-010': 'Verizon', '310-012': 'Verizon', '310-013': 'Verizon', '311-110': 'Verizon', '311-270': 'Verizon', '311-271': 'Verizon', '311-272': 'Verizon', '311-273': 'Verizon', '311-274': 'Verizon', '311-275': 'Verizon', '311-276': 'Verizon', '311-277': 'Verizon', '311-278': 'Verizon', '311-279': 'Verizon', '311-280': 'Verizon', '311-281': 'Verizon', '311-282': 'Verizon', '311-283': 'Verizon', '311-284': 'Verizon', '311-285': 'Verizon', '311-286': 'Verizon', '311-287': 'Verizon', '311-288': 'Verizon', '311-289': 'Verizon', '311-390': 'Verizon', '311-480': 'Verizon', '311-481': 'Verizon', '311-482': 'Verizon', '311-483': 'Verizon', '311-484': 'Verizon', '311-485': 'Verizon', '311-486': 'Verizon', '311-487': 'Verizon', '311-488': 'Verizon', '311-489': 'Verizon', '310-590': 'Verizon', '310-890': 'Verizon', '310-910': 'Verizon',
    '310-120': 'Sprint',
  };
}

//获取手机运营商信息
function getCellularInfo() {
  const radioGeneration = {
    'GPRS': '2.5G', 'CDMA1x': '2.5G', 'EDGE': '2.75G',
    'WCDMA': '3G', 'HSDPA': '3.5G', 'CDMAEVDORev0': '3.5G', 'CDMAEVDORevA': '3.5G',
    'CDMAEVDORevB': '3.75G', 'HSUPA': '3.75G', 'eHRPD': '3.9G',
    'LTE': '4G', 'NRNSA': '5G', 'NR': '5G',
  };

  let cellularInfo = '';
  const carrierNames = loadCarrierNames();
  // 使用 ?. 操作符安全访问
  if ($network['cellular-data']) {
    const carrierId = $network['cellular-data'].carrier;
    const radio = $network['cellular-data'].radio;
    // 如果没有连接 WiFi 且有蜂窝网络信号
    if (!$network.wifi?.ssid && radio) {
      cellularInfo = carrierNames[carrierId] ?
        `${carrierNames[carrierId]} | ${radioGeneration[radio] || radio}` :
        `蜂窝数据 | ${radioGeneration[radio] || radio}`;
    }
  }
  return cellularInfo;
}

function getSSID() {
  return $network.wifi?.ssid;
}

function getIP() {
  const v4 = $network.v4;
  const v6 = $network.v6;
  
  let info = [];
  
  if (!v4 && !v6) {
    info = ['网络可能切换', '请手动刷新以重新获取 IP'];
  } else {
    if (v4?.primaryAddress) info.push(`本机 IPv4：${v4?.primaryAddress}`);
    if (v6?.primaryAddress) info.push(`本机 IPv6：${v6?.primaryAddress}`);
    
    // 逻辑优化：只要有 v4 且有路由器地址，就尝试显示
    // 通常只有 WiFi 下 v4.primaryRouter 才有值
    if (v4?.primaryRouter) {
      info.push(`路由器 IP：${v4?.primaryRouter}`);
    }
  }
  return info.join("\n") + "\n";
}

function getCurrentTime() {
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

/**
 * 获取 IP 信息
 * @param {*} retryTimes 重试次数
 * @param {*} retryInterval 重试间隔 ms
 */
function getNetworkInfo(retryTimes = 5, retryInterval = 1000) {
  // 发送网络请求
  httpMethod.get('http://ip-api.com/json').then(response => {
    if (Number(response.status) > 300) {
      throw new Error(`Request error: ${response.status}\n${response.data}`);
    }
    const info = JSON.parse(response.data);
    
    // 构造 Title：ISP | 网络名称 (时间)
    const currentNetwork = getSSID() ?? getCellularInfo();
    const currentISP = info.isp || '未知运营商';
    const displayTitle = `${currentISP} | ${currentNetwork} (${getCurrentTime()})`;

    $done({
      title: displayTitle,
      content:
        getIP() +
        `现用节点：${info.query}\n` +
        `节点运营：${info.isp}\n` +
        `节点位置：${info.country} - ${info.city}`,
      icon: getSSID() ? 'wifi' : 'simcard',
      'icon-color': getSSID() ? '#005CAF' : '#F9BF45',
    });
  }).catch(error => {
    if (String(error).startsWith("Network changed")) {
      // 这里的清理其实对于当前执行流意义不大，但在重试逻辑中有用
    }
    
    if (retryTimes > 0) {
      logger.error(`Retry... Remaining: ${retryTimes}`);
      setTimeout(() => getNetworkInfo(--retryTimes, retryInterval), retryInterval);
    } else {
      logger.error(error);
      $done({
        title: '获取失败',
        content: '无法连接到 API，请检查网络\n' + error,
        icon: 'wifi.exclamationmark',
        'icon-color': '#CB1B45',
      });
    }
  });
}

/**
 * 程序入口
 */
(() => {
  const retryTimes = 5;
  const retryInterval = 1000;
  
  // 脚本超时保护
  const scriptTimeout = retryTimes * 5000 + retryTimes * retryInterval;
  setTimeout(() => {
    $done({
      title: "请求超时",
      content: "连接 API 超时，请检查网络。",
      icon: 'wifi.exclamationmark',
      'icon-color': '#CB1B45',
    });
  }, 29000); // Surge 默认 30s，设置 29s 提前返回

  logger.log("Script start");
  getNetworkInfo(retryTimes, retryInterval);
})();

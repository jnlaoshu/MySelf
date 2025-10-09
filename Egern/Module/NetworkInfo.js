//# 网络信息
//# 𝐔𝐑𝐋： https://raw.githubusercontent.com/jnlaoshu/MySelf/master/Egern/Module/NetworkInfo.js
//# 𝐅𝐫𝐨𝐦：https://github.com/Nebulosa-Cat/Surge/blob/main/Panel/Network-Info/net-info-panel.js
//# 𝐔𝐩𝐝𝐚𝐭𝐞：2025.10.09 11:30

/*
[Script]
网络信息 = type=generic,timeout=10,script-path=https://raw.githubusercontent.com/jnlaoshu/MySelf/master/Egern/Module/NetworkInfo.js
	
[Panel]
网络信息 = script-name=网络信息,title=网络信息,content=请刷新,style=info,update-interval=1
*/

/**
 * 网络请求封装为 Promise
 * Usage: httpMethod.get(option).then(response => { logger.log(data) }).catch(error => { logger.log(error) })
 * Usage: httpMethod.post(option).then(response => { logger.log(data) }).catch(error => { logger.log(error) })
 * response: { status, headers, data }
 */
class httpMethod {
    /**
     * Callback function
     * @param {*} resolve 
     * @param {*} reject 
     * @param {*} error 
     * @param {*} response 
     * @param {*} data 
     */
    static _httpRequestCallback(resolve, reject, error, response, data) {
        if (error) {
            reject(error);
        } else {
            resolve(Object.assign(response, { data }));
        }
    }

    /**
     * HTTP GET
     * @param {Object} option 選項
     * @returns 
     */
    static get(option = {}) {
        return new Promise((resolve, reject) => {
            $httpClient.get(option, (error, response, data) => {
                this._httpRequestCallback(resolve, reject, error, response, data);
            });
        });
    }

    /**
     * HTTP POST
     * @param {Object} option 选项
     * @returns 
     */
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
        this.id = randomString();
    }

    log(message) {
        message = `[${this.id}] [ LOG ] ${message}`;
        console.log(message);
    }

    error(message) {
        message = `[${this.id}] [ERROR] ${message}`;
        console.log(message);
    }
}

var logger = new loggerUtil();

function randomString(e = 6) {
    var t = "ABCDEFGHJKMNPQRSTWXYZabcdefhijkmnprstwxyz2345678",
        a = t.length,
        n = "";
    for (i = 0; i < e; i++) n += t.charAt(Math.floor(Math.random() * a));
    return n;
}

function getFlagEmoji(countryCode) {
    const codePoints = countryCode
        .toUpperCase()
        .split('')
        .map((char) => 127397 + char.charCodeAt());
    return String.fromCodePoint(...codePoints);
}


//取得手機使用服務業者訊息(透過內建 API 調用本機資訊)
function getCellularInfo() {
    const radioGeneration = {
        'GPRS': '2.5G',
        'CDMA1x': '2.5G',
        'EDGE': '2.75G',
        'WCDMA': '3G',
        'HSDPA': '3.5G',
        'CDMAEVDORev0': '3.5G',
        'CDMAEVDORevA': '3.5G',
        'CDMAEVDORevB': '3.75G',
        'HSUPA': '3.75G',
        'eHRPD': '3.9G',
        'LTE': '4G',
        'NRNSA': '5G',
        'NR': '5G',
    };

    let cellularInfo = '';
    if ($network['cellular-data']) {
        const carrierId = $network['cellular-data'].carrier;
        const radio = $network['cellular-data'].radio;
        if ($network.wifi?.ssid == null && radio) {
            cellularInfo = 
                `行動數據 | ${radioGeneration[radio]} - ${radio}`;
        }
    }
    return cellularInfo;
}

function getSSID() {
    return $network.wifi?.ssid;
}

function getIP() {
    const { v4, v6 } = $network;
    let info = [];
    if (!v4 && !v6) {
      info = ['網路可能切換', '請手動重整面板更新 IP'];
    } else {
      if (v4?.primaryAddress) info.push(`v4 @ ${v4?.primaryAddress}`);
      if (v6?.primaryAddress) info.push(`v6 @ ${v6?.primaryAddress}`);
      if (v4?.primaryRouter && getSSID()) info.push(`Router v4 @ ${v4?.primaryRouter}`);
      if (v6?.primaryRouter && getSSID()) info.push(`Router IPv6 @ ${v6?.primaryRouter}`);
    }
    info = info.join("\n");
    return info + "\n";
  }

/**
 * 獲取IP訊息
 * @param {*} retryTimes // 重試次數
 * @param {*} retryInterval // 重試間格 ms
 */
function getNetworkInfo(retryTimes = 5, retryInterval = 1000) {
    // send http request
    httpMethod.get('http://ip-api.com/json').then(response => {
        if (Number(response.status) > 300) {
            throw new Error(`Request error with http status code: ${response.status}\n${response.data}`);
        }
        const info = JSON.parse(response.data);
        $done({
            title: getSSID() ?? getCellularInfo(),
            content:
                `[IP Adress]\n` +
                getIP() +
                `[節點 IP] ${info.query}\n` +
                `[節點位置] ${info.isp}\n` +
                `[節點位置] ${getFlagEmoji(info.countryCode)} | ${info.country} - ${info.city}`,
            icon: getSSID() ? 'wifi' : 'simcard',
            'icon-color': getSSID() ? '#005CAF' : '#F9BF45',
        });
    }).catch(error => {
        // 網路切換
        if (String(error).startsWith("Network changed")) {
            if (getSSID()) {
                $network.wifi = undefined;
                $network.v4 = undefined;
                $network.v6 = undefined;
            }
        }
        // 判斷是否有重試機會
        if (retryTimes > 0) {
            logger.error(error);
            logger.log(`Retry after ${retryInterval}ms`);
            // retryInterval 時間後再次執行該函數
            setTimeout(() => getNetworkInfo(--retryTimes, retryInterval), retryInterval);
        } else {
            // 打印日誌
            logger.error(error);
            $done({
                title: '發生錯誤',
                content: '無法獲得目前網路資訊\n請檢查網際網路狀態後重試',
                icon: 'wifi.exclamationmark',
                'icon-color': '#CB1B45',
            });
        }
    });
}

/**
* 主要邏輯，程式開始
*/
(() => {
    const retryTimes = 5;
    const retryInterval = 1000;
    // Surge 腳本逾時時間設為 30s
    // 提早 500ms 結束進程
    const surgeMaxTimeout = 29500;
    // 腳本超時時間
    // retryTimes * 5000 為每次網路請求逾時時間（Surge 網路請求逾時為 5s）
    const scriptTimeout = retryTimes * 5000 + retryTimes * retryInterval;
    setTimeout(() => {
        logger.log("Script timeout");
        $done({
            title: "請求逾時",
            content: "連線請求逾時\n請檢查網際網路狀態後重試",
            icon: 'wifi.exclamationmark',
            'icon-color': '#CB1B45',
        });
    }, scriptTimeout > surgeMaxTimeout ? surgeMaxTimeout : scriptTimeout);

    // 獲取網路訊息
    logger.log("Script start");
    getNetworkInfo(retryTimes, retryInterval);
})();

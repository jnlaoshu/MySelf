// 网络信息详情面板
 // 𝐔𝐑𝐋： https://raw.githubusercontent.com/jnlaoshu/MySelf/master/Egern/NetworkInfo.js
 // 𝐅𝐫𝐨𝐦：https://raw.githubusercontent.com/deezertidal/Surge_Module/master/files/ip-api.js
 // 𝐔𝐩𝐝𝐚𝐭𝐞：2025.01.19 16:32

let url = "http://ip-api.com/json/?fields=8450015&lang=zh-CN"
$httpClient.get(url, function(error, response, data){
    let jsonData = JSON.parse(data)
	let query =jsonData.query 
	let isp =jsonData.isp
	let as =jsonData.as
	let country =jsonData.country
	let city =jsonData.city
	let timezone =jsonData.timezone
	let lon =jsonData.lon
	let lat =jsonData.lat
	let currency =jsonData.currency
    let emoji = getFlagEmoji(jsonData.countryCode)
const params = getParams($argument);
  body = {
    title: "节点信息",
    content: `🗺️IP：${query}\n🖥️ISP：${isp}\n#️⃣ASN：${as}\n🌍国家/地区：${emoji}${country}\n🏙城市：${city}\n🕗时区：${timezone}\n📍经纬度：${lon},${lat}\n🪙货币：${currency}`,
        icon: params.icon,
        "icon-color": params.color
  }
  $done(body);
});

function getFlagEmoji(countryCode) {
      if (countryCode.toUpperCase() == 'TW') {
    countryCode = 'CN'
  }
  const codePoints = countryCode
    .toUpperCase()
    .split('')
    .map(char => 127397 + char.charCodeAt())
  return String.fromCodePoint(...codePoints)
}

function getParams(param) {
  return Object.fromEntries(
    $argument
      .split("&")
      .map((item) => item.split("="))
      .map(([k, v]) => [k, decodeURIComponent(v)])
  );
}

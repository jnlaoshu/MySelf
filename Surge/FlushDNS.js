// DNS刷新 𝐔𝐑𝐋： https://raw.githubusercontent.com/jnlaoshu/MySelf/master/Surge/FlushDNS.js
// 𝐅𝐫𝐨𝐦： https://raw.githubusercontent.com/zZPiglet/Task/master/asset/flushDNS.js
// 𝐔𝐩𝐝𝐚𝐭𝐞：2022.05.02 17:00

/*
[Script]
DNS刷新 = type=generic,timeout=10,script-path=https://raw.githubusercontent.com/jnlaoshu/MySelf/master/Surge/FlushDNS.js,argument=title=DNS刷新&icon=arrow.clockwise&color=#5d84f8&server=false
// use "title" or "icon" or "color" or "server" in "argument":

[Panel]
DNS刷新 = script-name=DNS刷新,title=DNS刷新,content=请刷新,update-interval=600

*/

!(async () => {
    let panel = { title: "Flush DNS" },
        showServer = true,
        dnsCache;
    if (typeof $argument != "undefined") {
        let arg = Object.fromEntries($argument.split("&").map((item) => item.split("=")));
        if (arg.title) panel.title = arg.title;
        if (arg.icon) panel.icon = arg.icon;
        if (arg.color) panel["icon-color"] = arg.color;
        if (arg.server == "false") showServer = false;
    }
    if (showServer) {
        dnsCache = (await httpAPI("/v1/dns", "GET")).dnsCache;
        dnsCache = [...new Set(dnsCache.map((d) => d.server))].toString().replace(/,/g, "\n");
    }
    if ($trigger == "button") await httpAPI("/v1/dns/flush");
    let delay = ((await httpAPI("/v1/test/dns_delay")).delay * 1000).toFixed(0);
    panel.content = `delay: ${delay}ms${dnsCache ? `\nserver:\n${dnsCache}` : ""}`;
    $done(panel);
})();

function httpAPI(path = "", method = "POST", body = null) {
    return new Promise((resolve) => {
        $httpAPI(method, path, body, (result) => {
            resolve(result);
        });
    });
}

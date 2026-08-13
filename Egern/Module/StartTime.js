/**
 * Egern 面板脚本 - 自动计算运行时长
 */
(async () => {
    const now = new Date();
    const nowMs = now.getTime();

    // 1. 获取或记录启动时间 (持久化存储)
    let startTime = $persistentStore.read("egern_start_time");
    if (!startTime) {
        startTime = nowMs;
        $persistentStore.write(startTime.toString(), "egern_start_time");
    }

    // 2. 计算时间差
    const diff = nowMs - parseInt(startTime);
    const timeStr = formatDuration(diff);

    // 3. 点击事件处理 (刷新重置)
    if (typeof $trigger !== "undefined" && $trigger === "button") {
        // 点击按钮时重置时间戳（模拟重启效果）
        $persistentStore.write(nowMs.toString(), "egern_start_time");
        $notification.post("Egern 计时重置", "已重新开始计算运行时间", "");
    }

    // 4. 返回结果
    $done({
        title: "Egern 已运行 " + timeStr,
        content: `𝐌𝐢𝐭𝐌 ☑  𝐑𝐞𝐰𝐫𝐢𝐭𝐞 ☑  𝐒𝐜𝐫𝐢𝐩𝐭𝐢𝐧𝐠 ☑`,
        icon: "timer",
        "icon-color": "#34C759"
    });
})();

/**
 * 格式化时长函数
 * @param {number} ms 毫秒数
 */
function formatDuration(ms) {
    let seconds = Math.floor(ms / 1000);
    let minutes = Math.floor(seconds / 60);
    let hours = Math.floor(minutes / 60);
    let days = Math.floor(hours / 24);

    seconds %= 60;
    minutes %= 60;
    hours %= 24;

    if (days > 0) return `${days}天${hours}时${minutes}分`;
    if (hours > 0) return `${hours}时${minutes}分${seconds}秒`;
    if (minutes > 0) return `${minutes}分${seconds}秒`;
    return `${seconds}秒`;
}

# 源自网络，感谢分享！自用配置，谨慎使用！

* 只是搬运和同步更新（[@FEI](https://github.com/Infatuation-Fei/rule/tree/main/Stash)）等大佬脚本，不负责维护脚本.
---
### 全局配置：

* [Config.conf](https://raw.githubusercontent.com/jnlaoshu/MySelf/master/Stash/Config.yaml)

### 覆写脚本列表：
* [Script](https://github.com/jnlaoshu/MySelf/tree/main/Stash/Script)

### TikTok 解锁：

* [TikTok](https://github.com/jnlaoshu/MySelf/tree/main/Stash/Script/TikTokUnlock) 解锁 + 换区 + 发布视频 + 直播 + 点赞评论
---

使用说明
---
1.导入配置：选择“从URL下载”：https://raw.githubusercontent.com/jnlaoshu/MySelf/master/Stash/Config.yaml

2.替换订阅：从“编辑”进入，根据配置里的提示替换上自己的订阅链接即可，一定要注意不要粘贴多余的空格之类的

3.启动使用：正常情况下就可以点击“启动”按钮正常使用。如启动时如出现以下提示

![](https://raw.githubusercontent.com/Infatuation-Fei/explain/main/Picture/%E7%AD%9B%E9%80%89%E9%94%99%E8%AF%AF.png)

是因为不能从你的订阅链接里筛选到US(美国)节点，删掉US的`Proxy-Providers`里一整段与策略组使用的`use引用`这2处相关信息就可以了，即下图红圈标示出的两处：

![](https://raw.githubusercontent.com/Infatuation-Fei/explain/main/Picture/%E7%AD%9B%E9%80%89%E5%88%A0%E9%99%A4.png)

![](https://raw.githubusercontent.com/Infatuation-Fei/explain/main/Picture/%E7%AD%9B%E9%80%89%E5%88%A0%E9%99%A41.png)

若确定你的链接中已包含相关节点，请在proxy-providers里filter后自行增加节点名称关键词，每个关键词之间用“|”隔开

- 更新节点

后续更新节点通过启动后策略组左上角更新外部资源即可

![](https://raw.githubusercontent.com/Infatuation-Fei/explain/main/Picture/Config1.jpg)


特别提醒：
---
1.覆写规则通过首页覆写(Override)安装，使用时必须安装好mitm证书，mitm和重写的开关也必须保持开启状态

2.因iOS严格限制NE内存，规则过多在低于iOS15的设备上无法启动；低于iOS15的越狱设备可自行修改NE内存限制后使用（方法自行谷歌搜索，建议至少改成100M+）

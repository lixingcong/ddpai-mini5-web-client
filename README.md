# 导出记录仪中的轨迹到KML文件

## 使用方法

- PC端Chrome浏览器（Android则使用Yandex）安装[CORS扩展](https://mybrowseraddon.com/access-control-allow-origin.html)（跨站请求）
- 启用CORS扩展中的```Access-Control-Allow-Headers, Access-Control-Allow-Credentials, Access-Control-Allow-Origin:*```标志，用于篡改服务器repsonse头部
- 连接记录仪WiFi
- 打开网页，勾选合适的时间段，下载GPS轨迹

由于Chrome等现代浏览器对跨站预检较严，必须安装CORS扩展才能正确收到记录仪的HTTP回复。

## 截图

![](screenshot.jpg)

## 工作原理

- 盯盯拍记录仪是个HTTP服务器，只要连接到无线局域网下，经过App抓包，可以观察到API地址```http://193.168.0.1/cmd.cgi?cmd=API_GpsFileListReq```返回的是最近的GPS轨迹记录。也有网友对其抓包分析，如[这个博客](https://www.eionix.co.in/2019/10/10/reverse-engineer-ddpai-firmware.html)列出了几乎所有的API和使用VLC播放串流
- 每段gps记录是gpx文件（纯文本）或者git文件（tar压缩包，内含多个gpx）
- gpx文件中以```$GPRMC```和```$GPGGA```开头的字段为GPS记录，参考[GPS-NMEA文档](http://aprs.gids.nl/nmea/)即可解析出每一个时刻对应的GPS位置（WGS84坐标系）
- 参考[KML格式文档](https://developers.google.com/kml/documentation/kmlreference)即可导出完整的KML文件，可以在[Google Earth](https://earth.google.com/web/)中验证轨迹正确性

以上就是大致原理，可以根据基本原理做出简单的App，实现参数控制、回放视频等功能。鉴于精力有限，仅实现了基本的轨迹导出功能。
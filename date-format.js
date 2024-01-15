"use strict"

export {
	timestampToString,
	now
};

// 自行实现了Date的format()函数
// https://blog.scottchayaa.com/post/2019/05/27/javascript_date_memo

Date.prototype.format = function (fmt, utc = false) {
	let weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
	let o = utc?{
        "M+": this.getUTCMonth() + 1, //月份
		"d+": this.getUTCDate(), //日
		"h+": this.getUTCHours(), //小時
		"m+": this.getUTCMinutes(), //分
		"s+": this.getUTCSeconds(), //秒
		"q+": Math.floor((this.getUTCMonth() + 3) / 3), //季度
		'w+': weekdays[this.getUTCDay()],
		"S": this.getUTCMilliseconds() //毫秒
    } : {
		"M+": this.getMonth() + 1, //月份
		"d+": this.getDate(), //日
		"h+": this.getHours(), //小時
		"m+": this.getMinutes(), //分
		"s+": this.getSeconds(), //秒
		"q+": Math.floor((this.getMonth() + 3) / 3), //季度
		'w+': weekdays[this.getDay()],
		"S": this.getMilliseconds() //毫秒
	};
	if (/(y+)/.test(fmt))
        fmt = fmt.replace(RegExp.$1, ((utc ? this.getUTCFullYear():this.getFullYear()) + "").substr(4 - RegExp.$1.length));

	for (let k in o) {
		if (new RegExp("(" + k + ")").test(fmt)) {
			if (k !== 'w+')
				fmt = fmt.replace(RegExp.$1, (RegExp.$1.length == 1) ? (o[k]) : (("00" + o[k]).substr(("" + o[k]).length)));
			else
				fmt = fmt.replace(RegExp.$1, o[k]);
		}
	}
	return fmt;
}

const g_dateObj = new Date();

function timestampToString(ts, fmt, utc) {
	g_dateObj.setTime(ts * 1000);
	return g_dateObj.format(fmt, utc);
}

function now() {
	return (new Date()).getTime();
}
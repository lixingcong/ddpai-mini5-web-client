"use strict"

// global vars
var serverHostUrl = 'http://193.168.0.1';
var urlAPIGpsFileListReq = serverHostUrl + '/cmd.cgi?cmd=API_GpsFileListReq';
// var serverHostUrl = 'http://files.local';
// var urlAPIGpsFileListReq = serverHostUrl + '/g.php';

// gps arrays
var gpsFileListReq = [];
var gpxContents = {}; // 字典，为timestamp到GPS的映射
var gpxPreprocessContents = {}; // 字典，为startTime到gpx原文件内容的映射（只保留GPGGA和GPRMC行）

// miscs
const DateObj = new Date();
const TimestampOffset = DateObj.getTimezoneOffset() * 60000; // 本地时区与GMT相差秒数
var errorCount = 0;
var tableMulitselStatus = true;

// params
const PathSpeedThreshold = 1.5; // 速度阈值，用于统计轨迹总长度
const PathDistanceThreshold = 50; // 距离阈值，用于统计轨迹总长度
const LatLonDecimalPrecision = 7; // 写入到KML中的经纬度的小数位数
const KmlTimestampFormat = 'yyyy-MM-ddThh:mm:ssZ'; // KML规范的GMT时区时间格式
const KmlFileNameFormat = 'yyyyMMdd-hhmm'; // 另存为文件的文件名，不能含特殊字符，如冒号
const KmlDescriptionFormat = 'yyyy-MM-dd hh:mm'; // KML描述一个PlaceMark的注释
const HtmlTableFormat = 'MM-dd hh:mm'; // HTML网页中的日期格式

Date.prototype.format = function (fmt) {
	// https://blog.scottchayaa.com/post/2019/05/27/javascript_date_memo
	let weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
	let o = {
		"M+": this.getMonth() + 1, //月份
		"d+": this.getDate(), //日
		"h+": this.getHours(), //小時
		"m+": this.getMinutes(), //分
		"s+": this.getSeconds(), //秒
		"q+": Math.floor((this.getMonth() + 3) / 3), //季度
		'w+': weekdays[this.getDay()],
		"S": this.getMilliseconds() //毫秒
	};
	if (/(y+)/.test(fmt)) fmt = fmt.replace(RegExp.$1, (this.getFullYear() + "").substr(4 - RegExp.$1.length));
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

function timestampToString(ts, fmt, offset) {
	DateObj.setTime(ts * 1000 + offset);
	return DateObj.format(fmt);
}

function isMobileUserAgent() {
	return /Android|webOS|iPhone|iPad|Mac|Macintosh|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

function secondToHumanReadableString(second) {
	if (second < 60)
		return second + 's';
	if (second < 3600)
		return Math.trunc(second / 60) + 'm';
	if (second < 86400)
		return (second / 3600).toFixed(1) + 'h';
	return (second / 86400).toFixed(1) + 'd';
}

function byteToHumanReadableSize(bytes) {
	let sizes = ['B', 'K', 'M', 'G', 'T'];
	if (bytes == 0) return '0B';
	let i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
	return (bytes / Math.pow(1024, i)).toFixed(1) + sizes[i];
}

function isObjectEmpty(obj){
	// https://stackoverflow.com/questions/679915/how-do-i-test-for-an-empty-javascript-object
	for(let i in obj)
		return false;
	return true;
}

function zeroPad(num, places) {
	// add leading zero to integer number
	var zero = places - num.toString().length + 1;
	return Array(+(zero > 0 && zero)).join("0") + num;
}

$('#fetch-gps-file-list').click(function () {
	let entryList = $('#entryList');
	entryList.empty();
	gpsFileListReq = [];
	clearErrors();
	tableMulitselStatus = true;

	promiseHttpGetAjax(urlAPIGpsFileListReq).then((response) => {
		gpsFileListReq = API_GpsFileListReqToArray(response);
		if (gpsFileListReq.length > 0) {
			const groupGpsFileListReq = () => {
				let grouped = {};
				gpsFileListReq.forEach((g, idx) => {
					let from = g['from'];
					let fromDateStr = timestampToString(from, 'MM-dd', TimestampOffset);
					if (!(fromDateStr in grouped))
						grouped[fromDateStr] = [];
					grouped[fromDateStr].push(idx);
				});
				return grouped;
			}

			const grouped = groupGpsFileListReq();
			const groupedKeys = Object.keys(grouped).sort((a, b) => { return a.localeCompare(b); }); // oldest date first

			let innerHtml = '<table>\n';
			const multiSelect = '<a href="javascript:void(0)" id="table-multiselect-href">全选</a>';
			const copyAllUrls = '<a href="javascript:copyUrls(-1)" >时间 URL</a>';
			const wholeDaySelectHelp = '<span class="help-tip"><p>点击超链接，可快速勾选该行所有记录</p></span>';
			const copyAllUrlsHelp = '<span class="help-tip"><p>点击超链接，可以导出下载git/gpx原始文件地址<br/>单击标题栏，则导出已勾选的多行<br/>单击某行，则只导出该行</p></span>';
			innerHtml += '<thead><tr><th>日期' + wholeDaySelectHelp + '</th><th>' + copyAllUrls + copyAllUrlsHelp + '</th><th>时长</th><th>' + multiSelect + '</th></tr></thead>\n';
			innerHtml += '<tbody>\n';
			let from, fromHref, to, duration, button, checkBox;

			groupedKeys.forEach(k => {
				const idxes = grouped[k].sort((a, b) => {
					const ta = gpsFileListReq[a]['from'];
					const tb = gpsFileListReq[b]['from'];
					return ta - tb; // oldest date first
				});

				const idxCount = idxes.length;
				for (let i = 0; i < idxCount; ++i) {
					const idx = idxes[i];
					const g = gpsFileListReq[idx];
					from = g['from'];
					to = g['to'];

					innerHtml += '<tr>';
					if (0 == i) {
						const weekdayStr = timestampToString(from, 'ww', TimestampOffset);
						const selectDateRows = '<a href="javascript:selectHistoryRows([' + idxes.join(',') + '], false, true)">' + k + '</a>' + '</br>' + weekdayStr;
						innerHtml += '<td rowspan="' + idxCount + '" style="vertical-align:top;">' + selectDateRows + '</td>';
					}

					duration = secondToHumanReadableString(to - from);
					from = timestampToString(from, HtmlTableFormat, TimestampOffset);
					to = timestampToString(to, HtmlTableFormat, TimestampOffset);

					fromHref = '<a href="javascript:copyUrls(' + idx + ')">' + from + '</a>';
					button = '<button class="set-src-single-row" value="' + idx + '">单选</button><br/>';
					checkBox = '<label><input type="checkbox" value="' + idx + '" name="history-select">选择 </label>';
					innerHtml += '<td>' + fromHref + '<br/>' + to + '</td><td>' + duration + '</td><td>' + checkBox + button + '</td></tr>\n';
				}
			});

			innerHtml += '</tbody>\n';
			innerHtml += '</table>\n';
			entryList.html(innerHtml);

			$('.set-src-single-row').click(function () {
				const thisVal = parseInt($(this).val());
				const values = Array.from({ length: gpsFileListReq.length }, (_, i) => i);
				const valuesTrue = values.filter(i => i === thisVal);
				const valuesFalse = values.filter(i => i !== thisVal);
				selectHistoryRows(valuesTrue, true);
				selectHistoryRows(valuesFalse, false);
				tableMulitselStatus = true;
			});

			$('#table-multiselect-href').on('click', function () {
				let values = Array.from({ length: gpsFileListReq.length }, (_, i) => i);
				selectHistoryRows(values, tableMulitselStatus);
				tableMulitselStatus = !tableMulitselStatus;
			});
		} else {
			entryList.html('GPS file list from server is empty!');
		}
	}, (rejectedReason) => {
		appendError(rejectedReason);
	});
});

function now() {
	return (new Date()).getTime();
}

function isFilenameGpxGit(filename) {
	return filename.search(/\d{14}_\d{4}(_D)?\.g(px|it)/i) >= 0;
}

function exportToKml(isSingleFile) {
	let costTimestampBegin = now();
	let pathDictKeys = [];
	Object.keys(gpxContents).forEach(k => {
		const g = gpxContents[k];
		if (('lat' in g) && ('lon' in g))
			pathDictKeys.push(k);
	});

	let kmlFileList = $('#kmlFileList');
	kmlFileList.empty();
	$('#infoList').empty();
	if (pathDictKeys.length > 0) {
		// 分割
		let pathDictKeysGrouped = [];
		pathDictKeys.sort();
		let splitPathThreshold = splitPathThresholdSecond(); // s
		let lastTimestamp = 0;
		let lastGroup = new Array();
		if (splitPathThreshold < 1) { // 小于1表示不分割
			splitPathThreshold = Infinity;
			pathDictKeysGrouped.push(lastGroup);
		}
		pathDictKeys.forEach(timestamp => {
			if (timestamp - lastTimestamp > splitPathThreshold) {
				lastGroup = new Array();
				pathDictKeysGrouped.push(lastGroup);
			}
			lastGroup.push(timestamp);
			lastTimestamp = timestamp;
		});

		// console.log(pathDictKeysGrouped);

		function kmlGroupContent(pathDict, pathDictKeys, nameSuffix) {
			const tsFrom = pathDictKeys[0];
			const tsFromStr = timestampToString(tsFrom, KmlDescriptionFormat, 0);
			let tsTo = tsFrom;
			let kmlTrack = kmlPlacemarkHead('轨迹' + nameSuffix + ' ' + tsFromStr, undefined, 'TrackStyle', undefined) + kmlTrackHead();
			let kmlLineString = kmlPlacemarkHead('线条' + nameSuffix + ' ' + tsFromStr, undefined, 'LineStyle', undefined) + kmlLineStringHead();
			let kml = '';
			let kmlTimestampStr = '';

			// begin and end point
			let gpsAtTsFrom = pathDict[tsFrom];
			kmlTimestampStr = timestampToString(tsTo, KmlTimestampFormat, TimestampOffset);
			kml += kmlPlacemarkHead('起点' + nameSuffix + ' ' + tsFromStr, undefined, undefined, kmlTimestampStr) + kmlPlacemarkPoint(gpsAtTsFrom['lat'], gpsAtTsFrom['lon'], LatLonDecimalPrecision) + kmlPlacemarkTail();
			if (pathDictKeys.length > 1) {
				tsTo = pathDictKeys[pathDictKeys.length - 1];
				const tsToStr = timestampToString(tsTo, KmlDescriptionFormat, 0);
				kmlTimestampStr = timestampToString(tsTo, KmlTimestampFormat, TimestampOffset);
				let gpsAtTsTo = pathDict[tsTo];
				kml += kmlPlacemarkHead('终点' + nameSuffix + ' ' + tsToStr, undefined, undefined, kmlTimestampStr) + kmlPlacemarkPoint(gpsAtTsTo['lat'], gpsAtTsTo['lon'], LatLonDecimalPrecision) + kmlPlacemarkTail();
			}

			// tracks
			pathDictKeys.forEach(timestamp => {
				const g = pathDict[timestamp];
				let altitude = 0;
				if ('altitude' in g)
					altitude = g['altitude'];
				const lat = g['lat'];
				const lon = g['lon'];
				const kmlCoordWhen = timestampToString(timestamp, KmlTimestampFormat, TimestampOffset);
				kmlTrack += kmlTrackCoord(lat, lon, altitude, LatLonDecimalPrecision, kmlCoordWhen);
				kmlLineString += kmlLineStringCoord(lat, lon, LatLonDecimalPrecision);
			});
			kmlTrack += kmlTrackTail() + kmlPlacemarkTail();
			kmlLineString += kmlLineStringTail() + kmlPlacemarkTail();
			kml += kmlTrack + kmlLineString;

			return { 'kml': kml, 'pointCount': pathDictKeys.length, 'tsFrom': tsFrom, 'tsTo': tsTo };
		}

		function appendKmlResult(kmlContent, filename, pointCount, tsFrom, tsTo, tsAll) {
			filename += '.kml';
			let blob = new Blob([kmlContent], { type: 'application/vnd.google-earth.kml+xml' });
			let newLink = $('<a>', {
				text: filename,
				download: filename,
				href: URL.createObjectURL(blob)
			});

			kmlFileList.append(newLink);
			let kmlHint = '<br/>' + byteToHumanReadableSize(blob.size) + '，' + pointCount + '点';
			const duration = tsTo - tsFrom;
			if (duration > 0) {
				kmlHint += '，耗时' + secondToHumanReadableString(duration);
				const g1 = gpxContents[tsFrom];
				const g2 = gpxContents[tsTo];
				kmlHint += '，直线' + meterToString(wgs84PointDistance(g1['lat'], g1['lon'], g2['lat'], g2['lon']));
				if(tsAll.length > 0)
					kmlHint += '，里程' + meterToString(wgs84PathDistance(tsAll, PathSpeedThreshold, PathDistanceThreshold));
			}
			kmlFileList.append(kmlHint + '<br/>');
		}

		const fileNameTsFromTo = (a, b) => {
			return timestampToString(a, KmlFileNameFormat, 0) + '到' + timestampToString(b, KmlFileNameFormat, 0);
		}

		const descriptionTsFromTo = (a, b) => {
			return timestampToString(a, KmlDescriptionFormat, 0) + '到' + timestampToString(b, KmlDescriptionFormat, 0);
		}

		if (isSingleFile) {
			// isSingleFile = true表示单个文件，内含N条轨迹
			let kml = '';
			let tsFrom = Number.MAX_SAFE_INTEGER;
			let tsTo = Number.MIN_SAFE_INTEGER;
			let pathHint = '';
			const simpleTimestampToString = (a, b) => timestampToString(a, HtmlTableFormat, 0) + '~' + timestampToString(b, HtmlTableFormat, 0);
			pathDictKeysGrouped.forEach((keys, idx) => {
				const readableIdx = idx + 1;
				const idxStr = zeroPad(readableIdx, 2); // 2 -> 02
				const g = kmlGroupContent(gpxContents, keys, idxStr);
				const thisTsFrom = g['tsFrom'];
				const thisTsTo = g['tsTo'];
				const g1 = gpxContents[thisTsFrom];
				const g2 = gpxContents[thisTsTo];
				pathHint += '轨迹' + idxStr + '，' + simpleTimestampToString(thisTsFrom, thisTsTo) + '，' + secondToHumanReadableString(thisTsTo - thisTsFrom);
				pathHint += '，直线' + meterToString(wgs84PointDistance(g1['lat'], g1['lon'], g2['lat'], g2['lon']));
				pathHint += '，里程' + meterToString(wgs84PathDistance(keys, PathSpeedThreshold, PathDistanceThreshold)) + '<br>';

				const folderDesciption = fileNameTsFromTo(thisTsFrom, thisTsTo);
				kml += kmlFolderHead('轨迹' + idxStr + ' ' + folderDesciption) + g['kml'] + kmlFolderTail();

				if (tsFrom > thisTsFrom)
					tsFrom = thisTsFrom;
				if (tsTo < thisTsTo)
					tsTo = thisTsTo;
			});

			const filename = fileNameTsFromTo(tsFrom, tsTo) + '共' + pathDictKeysGrouped.length + '条';
			const fileDesciption = descriptionTsFromTo(tsFrom, tsTo) + '共' + pathDictKeysGrouped.length + '条';
			kml = kmlHead(fileDesciption) + kml + kmlTail();
			appendKmlResult(kml, filename, pathDictKeys.length, tsFrom, tsTo, []);
			kmlFileList.append(pathHint);
		} else {
			// isSingleFile = false表示每个KML只含1条轨迹
			pathDictKeysGrouped.forEach((keys) => {
				const g = kmlGroupContent(gpxContents, keys, '');
				const tsFrom = g['tsFrom'];
				const tsTo = g['tsTo'];
				const filename = fileNameTsFromTo(tsFrom, tsTo);
				const fileDesciption = descriptionTsFromTo(tsFrom, tsTo);
				const kml = kmlHead(fileDesciption, '文件夹') + g['kml'] + kmlTail();
				appendKmlResult(kml, filename, g['pointCount'], g['tsFrom'], g['tsTo'], keys);
			});
		}
	} else {
		kmlFileList.append($('<a>', {
			text: '轨迹KML内容为空',
			href: 'javascript:void(0);'
		}));
		kmlFileList.append('<br/>');
	}

	infoList.append('导出KML完成，耗时 ' + (now() - costTimestampBegin) + 'ms');
}

// ---- promise 1 ----
function promiseReadBlob(blob, isText) {
	return new Promise(function (resolve, reject) {
		let reader = new FileReader();
		reader.onload = function () { resolve(reader.result); };
		reader.onerror = reject;
		reader.onabort = reject;
		if (isText)
			reader.readAsText(blob);
		else
			reader.readAsArrayBuffer(blob);
	});
}

function promiseReadGpx(filename, blob) {
	return promiseReadBlob(blob, true).then((textData) => {
		const p = preprocessRawGpxFile(textData, 160, '\n');
		if(!isObjectEmpty(p))
			gpxPreprocessContents[p['startTime']] = p['content'];
		refreshDownloadProgress();
		return Promise.resolve();
	});
}

const promiseReadGit = async (filename, blob) => {
	// API: resolve([[key1,textData1], [key2,textData2], [key3,textData3], ...])
	const archive = await promiseReadBlob(blob, false).then(
		function (arrayBuffer) {
			return new Promise(function (resolve, reject) {
				let archive = archiveOpenArrayBuffer(filename, '', arrayBuffer);
				if (archive)
					resolve(archive);
				else
					reject(new Error('read archive error ' + filename));
			});
		}
	);

	if (archive) {
		const readEntryData = async (entry) => {
			return new Promise(function (resolve) {
				entry.readData(resolve);
			});
		}

		const readGpxFromEntry = async (e) => {
			if (e.is_file) {
				const entryData = await readEntryData(e);
				if (entryData)
					return promiseReadGpx(e.name, new Blob([entryData]));
				else
					return Promise.reject(new Error('Entrydata is null: ' + e.name));
			} else {
				return Promise.reject(new Error('It was not a file in ' + filename));
			}
		}

		let promises;
		if (isMobileUserAgent()) {
			const readFileDecorator = new RequestDecorator({
				maxLimit: 4, // restrict max concurrent on mobile phones
				requestApi: readGpxFromEntry
			});
			promises = archive.entries.map((e) => readFileDecorator.request(e));
		} else
			promises = archive.entries.map((e) => readGpxFromEntry(e));

		return Promise.allSettled(promises).then((results) => {
			results.forEach(r => {
				if (r.status === 'rejected') {
					appendError(r.reason);
				}
			});
			return Promise.resolve();
		});
	}

	return Promise.reject(new Error('Can not open archive: ' + filename));
}

function promiseHttpGetAjax(url, responseType = 'text') {
	// API: resolve(blobData)
	return new Promise(function (resolve, reject) {
		let xhr = new XMLHttpRequest();
		xhr.responseType = responseType;
		xhr.timeout = 3000;
		xhr.open('GET', url, true);
		xhr.send();
		xhr.onreadystatechange = function () {
			if (this.readyState === 4) {
				if (this.status === 200)
					resolve(this.response);
				else
					reject(new Error('(' + xhr.status + ') ' + url));
			}
		}
	});
}

const parseGitAndGpxFromBlob = (filename, blob) => {
	if (filename.endsWith('git'))
		return promiseReadGit(filename, blob);
	else if (filename.endsWith('gpx'))
		return promiseReadGpx(filename, blob);
	return Promise.reject(new Error('Filename suffix is neither gpx nor git: ' + filename));
};
// ---- promise 2 ----

function beforeDownloadGpsPaths() {
	gpxContents = {};
	gpxPreprocessContents = {};
	$('#kmlFileList').empty();
	$('#infoList').empty();
	clearErrors();
	setProgress(-1);
}

function mergePreprocessed(){
	// merge all preprocess gpx file content into a single dict
	let gpxPreprocessTimestamps = Object.keys(gpxPreprocessContents);
	gpxPreprocessTimestamps.sort();
	let concated = [];
	gpxPreprocessTimestamps.forEach(ts => { concated = concated.concat(gpxPreprocessContents[ts]); });
	gpxContents = gpxToPathDict(concated);
	gpxPreprocessContents = {}; // clean up
}

// 参数idxes为整数的数组
function downloadGpsPaths(idxes) {
	let costTimestampBegin = now();
	beforeDownloadGpsPaths();

	const requestInstance = new RequestDecorator({
		maxLimit: 4,
		requestApi: promiseHttpGetAjax
	});

	let promises = [];
	idxes.forEach(idx => {
		let g = gpsFileListReq[idx];
		g['filename'].forEach(filename => {
			let url = serverHostUrl + '/' + filename;
			promises.push(requestInstance.request(url, 'blob').then((blob) => {
				return parseGitAndGpxFromBlob(filename, blob);
			}));
		});
	});

	Promise.allSettled(promises).then(function (results) {
		results.forEach(r => {
			if (r.status === 'rejected') {
				appendError(r.reason);
			}
		});

		mergePreprocessed();
		setProgress(-2);
		refreshDownloadProgress(now() - costTimestampBegin);
	});
}

$('.set-gpx-src').click(function () {
	// before download Gps Paths
	gpxContents = {};
	gpxPreprocessContents = {};
	$('#kmlFileList').empty();
	$('#infoList').empty();
	clearErrors();

	let setToServer = $(this).val() < 1;
	if (setToServer) {
		// 从记录仪中获取
		let checkedBoxes = $("input[name='history-select']:checked");
		let idxes = new Array();

		$.each(checkedBoxes, function () {
			idxes.push(parseInt($(this).val()));
		});

		if (idxes.length <= 0) {
			appendError('从记录仪获取后，请勾选至少一项');
			return;
		}

		downloadGpsPaths(idxes);

	} else {
		let costTimestampBegin = now();
		$('#entryList').empty();
		let files = $("#fetch-gps-file-upload")[0].files;
		let fileCount = files.length;

		if (fileCount <= 0) {
			appendError('请至少上传一个文件');
			return;
		}

		// 处理上传的文件
		setProgress(-1);
		let promises = Object.keys(files).map((fileIndex) => {
			let f = files[fileIndex];
			let filename = f.name;
			if (isFilenameGpxGit(filename))
				return parseGitAndGpxFromBlob(filename, f);
			return Promise.reject(new Error('Filename is invalid: ' + filename));
		});

		Promise.allSettled(promises).then((results) => {
			results.forEach(r => {
				if (r.status === 'rejected') {
					appendError(r.reason);
				}
			});

			mergePreprocessed();
			setProgress(-2);
			refreshDownloadProgress(now() - costTimestampBegin);
		});
	}
});

$('.export-to-kml').click(function () {
	let singleFile = $(this).val() < 1;
	exportToKml(singleFile);
});

function appendError(s) {
	if (errorCount <= 0) {
		$('#errorListHeader').css('display', 'inline-block');
	}

	++errorCount;
	$('#errorCount').html(errorCount);
	$('#errorListBody').append(errorCount + ': ' + s + '<br/>');
}

function clearErrors() {
	$('#errorListHeader').css('display', 'none');
	$('#errorListBody').empty();
	errorCount = 0;
}

function refreshDownloadProgress(costTime = -1) {
	const finshedText = (costTime >= 0 ? '，已下载完毕（耗时' + costTime + 'ms）' : '');
	const pointTitle = (costTime >= 0 ? '原始点位数：' : '预处理：');
	const pointCount = (costTime >= 0 ? Object.keys(gpxContents).length : Object.keys(gpxPreprocessContents).length);
	$('#infoList').html(pointTitle + pointCount + finshedText + '<br/>');
}

function copyUrls(row) {
	let text2copy = '';
	let lineCount = 0;
	let rows = [];
	if (row < 0) {
		let checkedBoxes = $("input[name='history-select']:checked");
		$.each(checkedBoxes, function () {
			rows.push(parseInt($(this).val()));
		});

		if (rows.length <= 0) {
			alert('请勾选至少一项，才能复制URL');
			return;
		}
	} else
		rows.push(row);

	rows.forEach(r => {
		gpsFileListReq[r]['filename'].forEach(filename => {
			text2copy += serverHostUrl + '/' + filename + '\n';
			++lineCount;
		});
	});

	if (lineCount > 0) {
		if (!navigator.clipboard) {
			// use old commandExec() way
			let $temp = $("<textarea>"); // use textArea instead of input
			$("body").append($temp);
			$temp.val(text2copy).select();
			document.execCommand("copy");
			$temp.remove();
		} else {
			navigator.clipboard.writeText(text2copy);
		}

		alert('已经拷贝' + lineCount + '条URL到剪贴板！');
	}
}

$('#fetch-gps-file-upload').on('change', function () {
	let files = $("#fetch-gps-file-upload")[0].files;
	clearErrors();
	// 处理上传的文件
	Object.keys(files).forEach(function (fileIndex) {
		let filename = files[fileIndex].name;
		if (!isFilenameGpxGit(filename)) {
			appendError('Filename is invalid: ' + filename);
		}
	});
});

/**
 * 转成指数刻度
 *
 * @param {number} inputVal 输入值
 * @param {number} inputMinVal 输入值最小值，若输入值等于此值，会返回0
 * @param {number} inputMaxVal 输入值最大值，若输入值等于此值，会返回1
 * @param {number} base 指数的基，如Math.E
 * @param {number} baseMinX 图像最左侧的X，必须为正数。指数函数中取[-baseMiX, 0]这一段图像作为刻度
 * @returns {array} 返回值的范围[0,1]
 */
function scaleToIndex(inputVal, inputMinVal, inputMaxVal, base, baseMinX) {
	if (inputVal <= inputMinVal)
		return 0;
	if (inputVal >= inputMaxVal)
		return 1;

	inputVal -= inputMinVal; // 移到0
	inputVal /= (inputMaxVal - inputMinVal); // [0,1]
	inputVal -= 1; // [-1,0]
	inputVal *= baseMinX; // [baseMinX,0]
	return Math.pow(base, inputVal);
}

function splitPathThresholdSecond() {
	let inputBox = $('#split-path-threshold');
	let val = parseInt(inputBox.val());
	let minValue = parseInt(inputBox.prop('min'));
	let maxValue = parseInt(inputBox.prop('max'));
	let ratio = scaleToIndex(val, minValue, maxValue, Math.E, 5); // [0,1]
	return Math.abs(Math.trunc(ratio * 86400));
}

function updateSplitPathThresholdText() {
	let label = $('#split-path-threshold-text');
	let second = splitPathThresholdSecond();
	if (second < 1) {
		label.html('不分割');
	} else {
		label.html(secondToHumanReadableString(second));
	}
}

$('#split-path-threshold').on("change mousemove touchmove", updateSplitPathThresholdText);
updateSplitPathThresholdText();

function selectHistoryRows(values, checked = true, toggle = false) {
	let boxes = $("input[name='history-select']");
	$.each(boxes, function () {
		let thisValue = parseInt($(this).val());
		if (values.includes(thisValue)) {
			if (toggle) {
				let newChecked = !$(this).prop('checked');
				$(this).prop('checked', newChecked);
			} else
				$(this).prop('checked', checked);
		}
	});
}

// value=-1: indeterminate; value=[0,1): determinate; -2: hide div
function setProgress(value) {
	let div = $('#progressBarDiv');
	let pb = $('#progressBar');
	//console.log('change progress=' + value);
	if (value >= 0 && value <= 1) {
		div.show();
		pb.attr('value', value);
	} else if (value == -1) {
		div.show();
		pb.removeAttr('value');
	} else {
		div.hide();
	}
}

// lat纬度 lon经度 返回数字（单位：米）
function wgs84PointDistance(lat1, lon1, lat2, lon2) {
	const deg2rad = d => d * Math.PI / 180.0;
	const dx = lon1 - lon2;
	const dy = lat1 - lat2;
	const b = (lat1 + lat2) / 2.0;
	const Lx = deg2rad(dx) * 6367000.0 * Math.cos(deg2rad(b));
	const Ly = 6367000.0 * deg2rad(dy);
	const meter = Math.sqrt(Lx * Lx + Ly * Ly);

	return meter;
}

// 将数字（单位：米）转成字符串
function meterToString(meter) {
	if (meter > 1000)
		return (meter / 1000).toFixed(1) + 'km';
	return Math.trunc(meter) + 'm';
}

// timestamps 升序的时间戳数组 属于gpxContents字典的键
// speedThreshold 速度阈值，若某点瞬间速度大于该值（单位：km/h），则累积该位移
// distanceThreshold 距离阈值，若与上一点的距离大于该值（单位：米），则累积该位移
function wgs84PathDistance(timestamps, speedThreshold, distanceThreshold){
	let distance = 0.0;
	let lastLat = undefined;
	let lastLon = undefined;
	timestamps.forEach(ts => {
		const g = gpxContents[ts];
		const speed = ('speed' in g) ? g['speed'] : 0.0;
		const lat = g['lat'];
		const lon = g['lon'];

		if (speed > speedThreshold) {
			if (undefined !== lastLat)
				distance += wgs84PointDistance(lastLat, lastLon, lat, lon); // 减少计算次数
			lastLat = lat;
			lastLon = lon;
		} else {
			const thisDistance = (undefined !== lastLat) ? wgs84PointDistance(lastLat, lastLon, lat, lon) : 0.0;
			if (thisDistance > distanceThreshold) {
				distance += thisDistance;
				lastLat = lat;
				lastLon = lon;
			}
		}
	});
    return distance;
}

loadArchiveFormats(['tar'], function () {
	let button = $('#fetch-gps-file-list');
	button.html("从记录仪获取");
	button.prop('disabled', false);
});

// let interpolate = $('#interpolate:checkbox:checked').length > 0;
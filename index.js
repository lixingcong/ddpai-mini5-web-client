"use strict"

// global vars
var serverHostUrl = 'http://193.168.0.1';
var urlAPIGpsFileListReq = serverHostUrl + '/cmd.cgi?cmd=API_GpsFileListReq';
// var serverHostUrl = 'http://files.local';
// var urlAPIGpsFileListReq = serverHostUrl + '/g.php';

// gps arrays
var gpsFileListReq = [];
var gpxContents = [];

// miscs
var dateObj = new Date();
var timestampOffset = dateObj.getTimezoneOffset() * 60000;
var errorCount = 0;
var tableMulitselStatus = true;

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
	dateObj.setTime(ts * 1000 + offset);
	return dateObj.format(fmt);
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
					let fromDateStr = timestampToString(from, 'MM-dd', timestampOffset);
					if (!(fromDateStr in grouped))
						grouped[fromDateStr] = [];
					grouped[fromDateStr].push(idx);
				});
				return grouped;
			}

			const grouped = groupGpsFileListReq();
			const groupedKeys = Object.keys(grouped).sort((a, b) => { return a.localeCompare(b); }); // oldest date first

			const fmt = 'MM-dd hh:mm';
			let innerHtml = '<table>\n';
			const multiSelect = '<a href="javascript:void(0)" id="table-multiselect-href">全选</a>';
			const copyAllUrls = '<a href="javascript:copyUrls(-1)" >时间 URL</a>';
			innerHtml += '<thead><tr><th>日期</th><th>' + copyAllUrls + '</th><th>时长</th><th>' + multiSelect + '</th></tr></thead>\n';
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
						const weekdayStr = timestampToString(from, 'ww', timestampOffset);
						const selectDateRows = '<a href="javascript:selectHistoryRows([' + idxes.join(',') + '], false, true)">' + k + '</a>' + '</br>' + weekdayStr;
						innerHtml += '<td rowspan="' + idxCount + '" style="vertical-align:top;">' + selectDateRows + '</td>';
					}

					duration = secondToHumanReadableString(to - from);
					from = timestampToString(from, fmt, timestampOffset);
					to = timestampToString(to, fmt, timestampOffset);

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
	return filename.search(/\d{14}_\d{4}\.g(px|it)/i) >= 0;
}

function exportToKml(isSingleFile) {
	let costTimestampBegin = now();

	gpxContents.sort(function (a, b) {
		return a[0] > b[0] ? 1 : -1;
	});

	let pathDict = {};
	let convertedDict;
	gpxContents.forEach(gpx => {
		convertedDict = gpxToPathDict(gpx[1], 150, '\n');
		pathDict = Object.assign({}, pathDict, convertedDict);
	});

	let pathDictKeys = [];
	let g;
	Object.keys(pathDict).forEach(k => {
		if (!isNaN(+k)) {
			g = pathDict[k];
			if (('lat' in g) && ('lon' in g))
				pathDictKeys.push(k);
		}
	});

	let kmlFileList = $('#kmlFileList');
	kmlFileList.empty();
	$('#infoList').empty();
	setProgress(-1);
	if (pathDictKeys.length > 0) {
		// 分割
		let pathDictKeysGrouped = [];
		pathDictKeys = pathDictKeys.sort();
		let splitPathThreshold = splitPathThresholdSecond();; // s
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

		const fmt = 'MM月dd日hh时mm分';
		function kmlGroupContent(pathDict, pathDictKeys, index) {
			const tsFrom = pathDictKeys[0];
			const tsFromStr = timestampToString(tsFrom, fmt, 0);
			let tsTo = tsFrom;
			let tsToStr = '';
			const filename = '轨迹' + index;
			let kmlTrack = kmlPlacemarkHead(filename + '_' + tsFromStr, '盯盯拍导出', 'TrackStyle') + kmlTrackHead();
			let kmlLineString = kmlPlacemarkHead('线条' + index + '_' + tsFromStr, '盯盯拍导出', 'LineStyle') + kmlLineStringHead();
			let lat, lon, altitude;
			let kml = '';

			// begin and end point
			let gpsAtTsFrom = pathDict[tsFrom];
			kml += kmlPlacemarkHead('起点' + index, tsFromStr) + kmlPlacemarkPoint(gpsAtTsFrom['lat'], gpsAtTsFrom['lon'], 6) + kmlPlacemarkTail();
			if (pathDictKeys.length > 1) {
				tsTo = pathDictKeys[pathDictKeys.length - 1];
				tsToStr = timestampToString(tsTo, fmt, 0);
				let gpsAtTsTo = pathDict[tsTo];
				kml += kmlPlacemarkHead('终点' + index, tsToStr) + kmlPlacemarkPoint(gpsAtTsTo['lat'], gpsAtTsTo['lon'], 6) + kmlPlacemarkTail();
			}

			// tracks
			let kmlCoordWhen = '';
			pathDictKeys.forEach(timestamp => {
				g = pathDict[timestamp];
				altitude = 0;
				if ('altitude' in g)
					altitude = g['altitude'];
				lat = g['lat'];
				lon = g['lon'];
				kmlCoordWhen = timestampToString(timestamp, 'yyyy-MM-ddThh:mm:ssZ', timestampOffset);
				kmlTrack += kmlTrackCoord(lat, lon, altitude, 6, kmlCoordWhen);
				kmlLineString += kmlLineStringCoord(lat, lon, 6, true);
			});
			kmlTrack += kmlTrackTail() + kmlPlacemarkTail();
			kmlLineString += kmlLineStringTail() + kmlPlacemarkTail();
			kml += kmlTrack + kmlLineString;

			return { 'kml': kml, 'filename': filename, 'pointCount': pathDictKeys.length, 'tsFrom': tsFrom, 'tsTo': tsTo };
		}

		function appendKmlResult(kmlContent, filename, pointCount, duration) {
			filename += '.kml';
			let blob = new Blob([kmlContent]);
			let newLink = $('<a>', {
				text: filename,
				download: filename,
				href: URL.createObjectURL(blob)
			});

			kmlFileList.append(newLink);
			let kmlHint = '<br/>文件大小' + byteToHumanReadableSize(blob.size) + '，点位数量' + pointCount;
			if (duration >= 0)
				kmlHint += '，轨迹持续' + secondToHumanReadableString(duration);
			kmlFileList.append(kmlHint + '<br/>');
		}

		function tsFromToString(a, b) {
			return timestampToString(a, fmt, 0) + '到' + timestampToString(b, fmt, 0);
		}

		if (isSingleFile) {
			let kml = '';
			let tsFrom = Number.MAX_SAFE_INTEGER;
			let tsTo = Number.MIN_SAFE_INTEGER;
			let g = undefined;
			pathDictKeysGrouped.forEach((keys, idx) => {
				setProgress(idx / pathDictKeysGrouped.length);
				g = kmlGroupContent(pathDict, keys, idx + 1);
				kml += g['kml'];
				if (tsFrom > g['tsFrom'])
					tsFrom = g['tsFrom'];
				if (tsTo < g['tsTo'])
					tsTo = g['tsTo'];
			});
			setProgress(1);

			const filename = tsFromToString(tsFrom, tsTo) + '_轨迹共' + pathDictKeysGrouped.length + '条';
			kml = kmlHead(filename, '文件夹') + kml + kmlTail();
			let pointCount = pathDictKeys.length;
			let duration = -1;
			if (pointCount > 1)
				duration = pathDictKeys[pointCount - 1] - pathDictKeys[0];
			appendKmlResult(kml, filename, pointCount, duration);
		} else {
			let kml = undefined;
			let filename = undefined;
			let g = undefined;
			pathDictKeysGrouped.forEach((keys, idx) => {
				setProgress(idx / pathDictKeysGrouped.length);
				g = kmlGroupContent(pathDict, keys, '');
				const filename = tsFromToString(g['tsFrom'], g['tsTo']) + '_轨迹';
				kml = kmlHead(filename, '文件夹') + g['kml'] + kmlTail();
				appendKmlResult(kml, filename, g['pointCount'], g['tsTo'] - g['tsFrom']);
			});
			setProgress(1);
		}
	} else {
		kmlFileList.append($('<a>', {
			text: '轨迹KML内容为空',
			href: 'javascript:void(0);'
		}));
		kmlFileList.append('<br/>');
	}

	setProgress(-2);
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
		const key = filename.split('_')[0].substr(4); // 20210225124929_0060.gpx => 0225124929
		//console.log('key='+key);
		gpxContents.push([key, textData]);
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
	return Promise.reject(new Error('Unsupport file type: ' + filename));
};
// ---- promise 2 ----

function beforeDownloadGpsPaths() {
	gpxContents = [];
	$('#kmlFileList').empty();
	$('#infoList').empty();
	clearErrors();
	setProgress(-1);
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
		setProgress(-2);
		refreshDownloadProgress(now() - costTimestampBegin);
	});
}

$('.set-gpx-src').click(function () {
	// before download Gps Paths
	gpxContents = []
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
			appendError('请勾选至少一项');
			return;
		}

		downloadGpsPaths(idxes);

	} else {
		let costTimestampBegin = now();
		$('#entryList').empty();
		setProgress(-1);
		let files = $("#fetch-gps-file-upload")[0].files;
		let fileCount = files.length;

		if (fileCount <= 0) {
			appendError('请至少上传一个文件');
			return;
		}

		// 处理上传的文件
		let promises = Object.keys(files).map((fileIndex) => {
			let f = files[fileIndex];
			let filename = f.name;
			if (isFilenameGpxGit(filename))
				return parseGitAndGpxFromBlob(filename, f);
			return Promise.reject(new Error('Unsupport file: ' + filename));
		});

		Promise.allSettled(promises).then((results) => {
			results.forEach(r => {
				if (r.status === 'rejected') {
					appendError(r.reason);
				}
			});
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
	let finshedText = (costTime >= 0 ? '，已下载完毕（耗时' + costTime + 'ms）' : '');
	$('#infoList').html('轨迹文件数：' + gpxContents.length + finshedText + '<br/>');
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
			appendError('无效文件格式：' + filename);
		}
	});
});

/**
 * 转成指数刻度
 *
 * @param {number} inputVal 输入值
 * @param {*} inputMinVal 输入值最小值，若输入值等于此值，会返回0
 * @param {*} inputMaxVal 输入值最大值，若输入值等于此值，会返回1
 * @param {*} base 指数的基，如Math.E
 * @param {*} baseMinX 图像最左侧的X，必须为正数。指数函数中取[-baseMiX, 0]这一段图像作为刻度
 * @returns {*} 返回值的范围[0,1]
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
	console.log('change progress=' + value);
	if (value >= 0 && value <= 1) {
		div.show();
		pb.attr('value', value);
	} else if (value == -1) {
		div.show();
		pb.removeAttr('value');
	} else {
		console.log('hide progress');
		div.hide();
	}
}

loadArchiveFormats(['tar'], function () {
	let button = $('#fetch-gps-file-list');
	button.html("从记录仪获取");
	button.prop('disabled', false);
});

// let interpolate = $('#interpolate:checkbox:checked').length > 0;
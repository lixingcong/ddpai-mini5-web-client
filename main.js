"use strict"

// global vars
var serverHostUrl = 'http://193.168.0.1';
var urlAPIGpsFileListReq = serverHostUrl + '/cmd.cgi?cmd=API_GpsFileListReq';
// var serverHostUrl = 'http://files.local';
// var urlAPIGpsFileListReq = serverHostUrl + '/g.php';

// params
var serverAjaxTimeout = 3000;

// gps arrays
var gpsFileListReq = [];
var gpxContents = null;
var gpxContentsExpectCount = 0;
var gpxHttpPendingFilenames = [];

// miscs
var dateObj = new Date();
var timestampOffset = dateObj.getTimezoneOffset() * 60000;
var errorCount = 0;
var tableMulitselStatus = false;
var infoCounter = 0;

Date.prototype.format = function (fmt) {
	// https://blog.scottchayaa.com/post/2019/05/27/javascript_date_memo
	let o = {
		"M+": this.getMonth() + 1, //月份
		"d+": this.getDate(), //日
		"h+": this.getHours(), //小時
		"m+": this.getMinutes(), //分
		"s+": this.getSeconds(), //秒
		"q+": Math.floor((this.getMonth() + 3) / 3), //季度
		"S": this.getMilliseconds() //毫秒
	};
	if (/(y+)/.test(fmt)) fmt = fmt.replace(RegExp.$1, (this.getFullYear() + "").substr(4 - RegExp.$1.length));
	for (let k in o)
		if (new RegExp("(" + k + ")").test(fmt)) fmt = fmt.replace(RegExp.$1, (RegExp.$1.length == 1) ? (o[k]) : (("00" + o[k]).substr(("" + o[k]).length)));
	return fmt;
}

function timestampToString(ts, fmt, offset) {
	dateObj.setTime(ts * 1000 + offset);
	return dateObj.format(fmt);
}

function decreaseGpxContentsExpectCount() {
	--gpxContentsExpectCount;
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

function appendGpxContentsFromArrayBuffer(filename, arrayBuffer) {
	let archive = archiveOpenArrayBuffer(filename, '', arrayBuffer);
	if (archive) {
		let validEntries = [];
		archive.entries.forEach(e => {
			if (e.is_file)
				validEntries.push(e);
		});
		let entryCount = validEntries.length;
		gpxContentsExpectCount += entryCount;
		for (let i = 0; i < entryCount; ++i) {
			let entry = validEntries[i];
			entry.readData(function (data) {
				function promiseReader(file) {
					return new Promise(function (resolve, reject) {
						let reader = new FileReader();
						reader.onload = function () { resolve(reader.result); };
						reader.onerror = reject;
						reader.onabort = reject;
						reader.readAsText(file);
					});
				}

				promiseReader(new Blob([data])).then(function (result) { // on ok
					let sortKey = parseInt(entry.name.split('_')[0].substr(4));
					//console.log('push ' + entry.name);
					gpxContents.push([sortKey, result]);
				}, function () {
					appendError('Error reading ' + entry.name + ' from ' + filename);
					decreaseGpxContentsExpectCount();
				}).then(function () {
					if (i + 1 === entryCount)
						decreaseGpxContentsExpectCount(); // last one
					showSourceProgress();
				});
			});
		}
	} else
		decreaseGpxContentsExpectCount(); // restore from downloadGpsPaths(idxes)
}

$('#fetch-gps-file-list').click(function () {
	let entryList = $('#entryList');
	entryList.empty();
	gpsFileListReq = [];
	clearErrors();
	tableMulitselStatus = false;

	$.ajax({
		type: 'GET',
		url: urlAPIGpsFileListReq,
		timeout: serverAjaxTimeout,
		success: function (response) {
			gpsFileListReq = API_GpsFileListReqToArray(response);
			if (gpsFileListReq.length > 0) {
				let fmt = 'MM月dd日 hh:mm';
				let innerHtml = '<table>\n';
				let multiSelect = '<a href="javascript:void(0)" id="table-multiselect-href">全选</a>';
				innerHtml += '<thead><tr><th>轨迹时间 URL</th><th>时长</th><th>git</th><th>gpx</th><th>' + multiSelect + '</th></tr></thead>\n';
				innerHtml += '<tbody>\n';
				let row = 0;
				let from, fromHref, to, duration, button, checkBox, gitCount, gpxCount;
				gpsFileListReq.forEach(g => {
					from = g['from'];
					to = g['to'];
					duration = secondToHumanReadableString(to - from);
					from = timestampToString(from, fmt, timestampOffset);
					to = timestampToString(to, fmt, timestampOffset);
					gitCount = g['git'];
					gpxCount = g['gpx'];

					fromHref = '<a href="javascript:copyUrls(' + row + ')">' + from + '</a>';
					button = '<button class="set-src-single-row" value="' + row + '">单选</button><br/>';
					checkBox = '<label><input type="checkbox" value="' + row + '" name="history-select" checked="true">选择 </label>';
					innerHtml += '<tr><td>' + fromHref + '<br/>' + to + '</td><td>' + duration + '</td><td>' + (gitCount > 0 ? gitCount : '') + '</td>' + '<td>' + (gpxCount > 0 ? gpxCount : '') + '</td><td>' + checkBox + button + '</td></tr>\n';
					row++;
				});
				innerHtml += '</tbody>\n';
				innerHtml += '</table>\n';
				entryList.html(innerHtml);

				$('.set-src-single-row').click(function () {
					let thisValue = $(this).val();
					let boxes = $("input[name='history-select']");
					$.each(boxes, function () {
						$(this).prop('checked', false);
						if ($(this).val() === thisValue)
							$(this).prop('checked', true);
					});
					tableMulitselStatus = true;
				});
				$('#table-multiselect-href').on('click', function () {
					let boxes = $("input[name='history-select']");
					$.each(boxes, function () {
						$(this).prop('checked', tableMulitselStatus);
					});
					tableMulitselStatus = !tableMulitselStatus;
				});
			} else {
				entryList.html('GPS file list from server is empty!');
			}
		},
		error: function () {
			appendError('Failed to download ' + this.url);
		},
		abort: function () {
			appendError('Abort to download ' + this.url);
		}
	});
});

function isFilenameGpxGit(filename) {
	return filename.search(/\d{14}_\d{4}\.g(px|it)/i) >= 0;
}

function parseBlob(filename, blob) {
	function promiseReader(isText) {
		return new Promise(function (resolve, reject) {
			let reader = new FileReader();
			reader.onload = function () { resolve(reader.result); };
			reader.onabort = reject;
			reader.onerror = reject;
			if (isText)
				reader.readAsText(blob);
			else
				reader.readAsArrayBuffer(blob);
		});
	}

	if (filename.endsWith('.git') || filename.endsWith('.tar')) {
		promiseReader(false).then(function (result) {
			appendGpxContentsFromArrayBuffer(filename, result);
		}, function () {
			appendError('无法解析 ' + filename);
		});
	} else if (filename.endsWith('.gpx')) {
		promiseReader(true).then(function (result) {
			let sortKey = parseInt(filename.split('_')[0].substr(4));
			// console.log('push raw ' + filename);
			gpxContents.push([sortKey, result]);
		}, function () {
			decreaseGpxContentsExpectCount();
			appendError('无法解析 ' + filename);
		}).then(function () {
			showSourceProgress();
		});
	}
}

function beginDownloadGpsPath() {
	if (gpxHttpPendingFilenames.length > 0) {
		let filename = gpxHttpPendingFilenames.pop();
		$.ajax({
			type: 'GET',
			url: serverHostUrl + '/' + filename,
			xhrFields: {
				responseType: 'blob'
			},
			timeout: serverAjaxTimeout,
			success: function (response) {
				parseBlob(filename, response);
			},
			error: function () {
				appendError('Failed to download ' + this.url);
				decreaseGpxContentsExpectCount();
				showSourceProgress();
			},
			abort: function () {
				appendError('Abort to download ' + this.url);
				decreaseGpxContentsExpectCount();
				showSourceProgress();
			},
			complete: function () {
				beginDownloadGpsPath(); // 继续下载另一个URL
			}
		});
	}
}

function showSourceProgress() {
	$('#kmlParseProgress').html('#' + (++infoCounter) + ' 轨迹文件数(' + gpxContents.length + '/' + gpxContentsExpectCount + '), 剩余HTTP请求' + gpxHttpPendingFilenames.length + '<br/>');
}

function exportToKml(isSingleFile) {
	let costTimestampBegin = (new Date()).getTime();

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

		let fmt = 'MM月dd日hh时mm分';
		function kmlGroupContent(pathDict, pathDictKeys, index) {
			let tsFrom = pathDictKeys[0];
			let tsFromStr = timestampToString(tsFrom, fmt, 0);
			let filename = '轨迹' + index + '_' + tsFromStr;
			let kmlTrack = kmlPlacemarkHead(filename, '盯盯拍导出', 'TrackStyle') + kmlTrackHead();
			let kmlLineString = kmlPlacemarkHead('线条' + index + '_' + tsFromStr, '盯盯拍导出', 'LineStyle') + kmlLineStringHead();
			let lat, lon, altitude;
			let kml ='';

			// begin and end point
			let gpsAtTsFrom = pathDict[tsFrom];
			kml += kmlPlacemarkHead('起点' + index, tsFromStr) + kmlPlacemarkPoint(gpsAtTsFrom['lat'], gpsAtTsFrom['lon'], 6) + kmlPlacemarkTail();
			let duration = '';
			if (pathDictKeys.length > 1) {
				let tsTo = pathDictKeys[pathDictKeys.length - 1];
				let tsToStr = timestampToString(tsTo, fmt, 0);
				filename += '到' + tsToStr;
				duration = '，轨迹持续' + secondToHumanReadableString(tsTo - tsFrom);

				let gpsAtTsTo = pathDict[tsTo];
				kml += kmlPlacemarkHead('终点' + index, tsToStr) + kmlPlacemarkPoint(gpsAtTsTo['lat'], gpsAtTsTo['lon'], 6) + kmlPlacemarkTail();
			}

			// tracks
			pathDictKeys.forEach(timestamp => {
				g = pathDict[timestamp];
				altitude = 0;
				if ('altitude' in g)
					altitude = g['altitude'];
				lat = g['lat'];
				lon = g['lon'];
				tsFromStr = timestampToString(timestamp, 'yyyy-MM-ddThh:mm:ssZ', timestampOffset);
				kmlTrack += kmlTrackCoord(lat, lon, altitude, 6, tsFromStr);
				kmlLineString += kmlLineStringCoord(lat, lon, 6, true);
			});
			kmlTrack += kmlTrackTail() + kmlPlacemarkTail();
			kmlLineString += kmlLineStringTail() + kmlPlacemarkTail();
			kml += kmlTrack + kmlLineString;

			return { 'kml': kml, 'filename': filename, 'duration': duration, 'pointCount': pathDictKeys.length };
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
			kmlFileList.append('<br/>文件大小' + byteToHumanReadableSize(blob.size) + '，点位数量' + pointCount + duration + '<br/>');
		}

		if (isSingleFile) {
			let filename = '轨迹(共' + pathDictKeysGrouped.length + '条)_' + timestampToString(pathDictKeys[0], fmt, 0);
			let kml = kmlHead(filename, '文件夹');
			let kmlGroupContentIndex = 0;
			pathDictKeysGrouped.forEach(keys => {
				kml += kmlGroupContent(pathDict, keys, ++kmlGroupContentIndex)['kml'];
			});
			kml += kmlTail();
			let pointCount = pathDictKeys.length;
			let duration = '';
			if (pointCount > 1)
				duration = '，轨迹持续' + secondToHumanReadableString(pathDictKeys[pointCount - 1] - pathDictKeys[0]);
			appendKmlResult(kml, filename, pointCount, duration);
		} else {
			let kml = undefined;
			let filename = undefined;
			let g = undefined;
			pathDictKeysGrouped.forEach(keys => {
				g = kmlGroupContent(pathDict, keys, '');
				filename = g['filename'];
				kml = kmlHead(filename, '文件夹') + g['kml'] + kmlTail();
				appendKmlResult(kml, filename, g['pointCount'], g['duration']);
			});
		}
	} else {
		kmlFileList.append($('<a>', {
			text: '轨迹KML内容为空',
			href: 'javascript:void(0);'
		}));
		kmlFileList.append('<br/>');
	}

	let costTimestampEnd = (new Date()).getTime();
	infoList.append('处理完成，总耗时 ' + (costTimestampEnd - costTimestampBegin) + 'ms');
}

// 参数idxes为整数的数组
function downloadGpsPaths(idxes) {
	idxes.forEach(idx => {
		let g = gpsFileListReq[idx];
		g['filename'].forEach(filename => {
			if (isFilenameGpxGit(filename)) {
				gpxHttpPendingFilenames.push(filename);
				++gpxContentsExpectCount; // gpx+git文件期望个数，须预先在这里设置好
			}
		});
	});

	if (idxes.length > 0) {
		for (let i = 0; i < 4; ++i) // 限制下载连接数
			beginDownloadGpsPath();
	}
}

$('.set-gpx-src').click(function () {
	// before download Gps Paths
	gpxContents = new Array();
	gpxContentsExpectCount = 0;
	infoCounter = 0;
	gpxHttpPendingFilenames = new Array();
	$('#kmlFileList').empty();
	$('#infoList').empty();
	$('#kmlParseProgress').empty();
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
		$('#entryList').empty();
		let files = $("#fetch-gps-file-upload")[0].files;
		let fileCount = files.length;

		if (fileCount <= 0) {
			appendError('请至少上传一个文件');
			return;
		}

		// 处理上传的文件
		Object.keys(files).forEach(function (fileIndex) {
			let f = files[fileIndex];
			let filename = f.name;
			if (isFilenameGpxGit(filename)) {
				++gpxContentsExpectCount;
				parseBlob(filename, f);
			}
		});
	}
});

$('.export-to-kml').click(function () {
	let singleFile = $(this).val() < 1;
	exportToKml(singleFile);
});

function appendError(s) {
	if (errorCount <= 0) {
		console.log("err count=" + errorCount);
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

function copyUrls(row) {
	let text2copy = '';
	let lineCount = 0;
	gpsFileListReq[row]['filename'].forEach(filename => {
		text2copy += serverHostUrl + '/' + filename + '\n';
		++lineCount;
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

$('#split-path-threshold').on("change mousemove", function () {
	let label = $('#split-path-threshold-text');
	let checkBoxMultiKML = $('#split-into-multi-kml-span');
	let second = splitPathThresholdSecond();
	if (second < 1) {
		label.html('无');
		checkBoxMultiKML.css('display', 'none');
	} else {
		label.html(secondToHumanReadableString(second));
		checkBoxMultiKML.css('display', 'inline-block');
	}
});

loadArchiveFormats(['tar'], function () {
	let button = $('#fetch-gps-file-list');
	button.html("从记录仪获取");
	button.prop('disabled', false);
});

// let interpolate = $('#interpolate:checkbox:checked').length > 0;
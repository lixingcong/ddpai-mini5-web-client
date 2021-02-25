"use strict"

// global vars
// var serverHostUrl = 'http://files.local';
var serverHostUrl = 'http://193.168.0.1';
var serverAjaxTimeout = 3000;

var gpsFileListReq = undefined;
var gpxContents = undefined;
var gpxContentsExpectCount = 0;
var gpxHttpPendingFilenames = undefined;

var dateObj = new Date();
var timestampOffset = dateObj.getTimezoneOffset() * 60000;
var errorOccurred = false;
var tableMulitselStatus = false;
var costTimestampBegin = 0;
var infoCounter = 0;

Date.prototype.format = function (fmt) {
	// https://blog.scottchayaa.com/post/2019/05/27/javascript_date_memo
	var o = {
		"M+": this.getMonth() + 1, //月份
		"d+": this.getDate(), //日
		"h+": this.getHours(), //小時
		"m+": this.getMinutes(), //分
		"s+": this.getSeconds(), //秒
		"q+": Math.floor((this.getMonth() + 3) / 3), //季度
		"S": this.getMilliseconds() //毫秒
	};
	if (/(y+)/.test(fmt)) fmt = fmt.replace(RegExp.$1, (this.getFullYear() + "").substr(4 - RegExp.$1.length));
	for (var k in o)
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
	var sizes = ['B', 'K', 'M', 'G', 'T'];
	if (bytes == 0) return '0B';
	var i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
	return (bytes / Math.pow(1024, i)).toFixed(1) + sizes[i];
}

function appendGpxContentsFromArrayBuffer(filename, arrayBuffer) {
	var archive = archiveOpenArrayBuffer(filename, '', arrayBuffer);
	if (archive) {
		let entryCount = archive.entries.length;
		for (let i = 0; i < entryCount; ++i) {
			let entry = archive.entries[i];
			if (!entry.is_file)
				continue;
			++gpxContentsExpectCount;
			entry.readData(function (data) {
				var arrayBufReader = new FileReader();
				arrayBufReader.onload = function () {
					var sortKey = parseInt(entry.name.split('_')[0].substr(4));
					// console.log('push ' + entry.name);
					gpxContents.push([sortKey, this.result]);
					if (i + 1 === entryCount)
						decreaseGpxContentsExpectCount(); // last one
					endAppendGpxContents();
				};
				arrayBufReader.onerror = function () {
					decreaseGpxContentsExpectCount();
					if (i + 1 === entryCount)
						decreaseGpxContentsExpectCount(); // last one
				};
				arrayBufReader.onabort = function () {
					decreaseGpxContentsExpectCount();
					if (i + 1 === entryCount)
						decreaseGpxContentsExpectCount(); // last one
				};
				arrayBufReader.readAsText(new Blob([data]));
			});
		}
	} else
		decreaseGpxContentsExpectCount(); // restore from downloadGpsPaths(idxes)
}

$('#fetch-gps-file-list').click(function () {
	var entryList = $('#entryList');
	entryList.empty();
	gpsFileListReq = undefined;
	clearErrors();
	tableMulitselStatus = false;

	// var url = serverHostUrl + '/g.php';
	var url = serverHostUrl + '/cmd.cgi?cmd=API_GpsFileListReq';
	$.ajax({
		type: 'GET',
		url: url,
		timeout: serverAjaxTimeout,
		success: function (response) {
			gpsFileListReq = API_GpsFileListReqToArray(response);
			if (gpsFileListReq.length > 0) {
				var fmt = 'MM月dd日 hh:mm';
				var innerHtml = '<table>\n';
				var multiSelect = '<a href="javascript:void(0)" id="table-multiselect-href">多选</a>';
				innerHtml += '<thead><tr><th>轨迹时间 URL</th><th>时长</th><th>git</th><th>gpx</th><th>' + multiSelect + '</th><th>单选</th></tr></thead>\n';
				innerHtml += '<tbody>\n';
				var row = 0;
				var from, fromHref, to, duration, button, checkBox, gitCount, gpxCount;
				gpsFileListReq.forEach(g => {
					from = g['from'];
					to = g['to'];
					duration = secondToHumanReadableString(to - from);
					from = timestampToString(from, fmt, timestampOffset);
					to = timestampToString(to, fmt, timestampOffset);
					gitCount = g['git'];
					gpxCount = g['gpx'];

					fromHref = '<a href="javascript:copyUrls(' + row + ')">' + from + '</a>';
					button = '<button class="btn-download-single" value="' + row + '">下载</button>';
					checkBox = '<label><input type="checkbox" value="' + row + '" name="history-select" checked="true">选择</label>';
					innerHtml += '<tr><td>' + fromHref + '<br/>' + to + '</td><td>' + duration + '</td><td>' + (gitCount > 0 ? gitCount : '') + '</td>' + '<td>' + (gpxCount > 0 ? gpxCount : '') + '</td><td>' + checkBox + '</td><td>' + button + '</td></tr>\n';
					row++;
				});
				innerHtml += '</tbody>\n';
				innerHtml += '</table>\n';
				entryList.html(innerHtml);

				$('.btn-download-single').click(function () {
					var idxes = [$(this).val()];
					downloadGpsPaths(idxes);
				});
				$('#table-multiselect-href').on('click', function () {
					var boxes = $("input[name='history-select']");
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

function beforeDownloadGpsPaths() {
	gpxContents = new Array();
	gpxContentsExpectCount = 0;
	infoCounter = 0;
	gpxHttpPendingFilenames = new Array();
	costTimestampBegin = (new Date()).getTime();
	$('#kmlFileList').empty();
	$('#infoList').empty();
	$('#errorList').empty();
}

function beginDownloadGpsPath() {
	if (gpxHttpPendingFilenames.length > 0) {
		var filename = gpxHttpPendingFilenames.pop();
		$.ajax({
			type: 'GET',
			url: serverHostUrl + '/' + filename,
			xhrFields: {
				responseType: 'blob'
			},
			timeout: serverAjaxTimeout,
			success: function (response) {
				var fileReader = new FileReader();
				if (filename.endsWith('.git')) {
					// tar file
					fileReader.onload = function () {
						appendGpxContentsFromArrayBuffer(filename, this.result);
					};
					fileReader.readAsArrayBuffer(response);
				} else if (filename.endsWith('.gpx')) {
					fileReader.onload = function () {
						var sortKey = parseInt(filename.split('_')[0].substr(4));
						// console.log('push raw ' + filename);
						gpxContents.push([sortKey, this.result]);
						endAppendGpxContents();
					};
					fileReader.onerror = decreaseGpxContentsExpectCount
					fileReader.onabort = decreaseGpxContentsExpectCount;
					fileReader.readAsText(response);
				}
			},
			error: function () {
				appendError('Failed to download ' + this.url);
			},
			abort: function () {
				appendError('Abort to download ' + this.url);
			},
			complete: function () {
				beginDownloadGpsPath(); // 继续下载另一个URL
			}
		});
	}
}

function endAppendGpxContents() {
	if (0 >= gpxContentsExpectCount)
		return;

	var infoList = $('#infoList');

	infoList.html('#' + (++infoCounter) + ' 轨迹文件数(' + gpxContents.length + '/' + gpxContentsExpectCount + '), 剩余HTTP请求' + gpxHttpPendingFilenames.length + '<br/>');
	if (gpxHttpPendingFilenames.length === 0 && gpxContentsExpectCount <= gpxContents.length) {
		gpxContents.sort(function (a, b) {
			return a[0] > b[0] ? 1 : -1;
		});

		var pathDict = {};
		var convertedDict;
		gpxContents.forEach(gpx => {
			convertedDict = gpxToPathDict(gpx[1], 150, '\n');
			pathDict = Object.assign({}, pathDict, convertedDict);
		});

		var pathDictKeys = [];
		var g;
		Object.keys(pathDict).forEach(k => {
			if (!isNaN(+k)) {
				g = pathDict[k];
				if (('lat' in g) && ('lon' in g))
					pathDictKeys.push(k);
			}
		});

		var kmlFileList = $('#kmlFileList');
		var pointCount = pathDictKeys.length
		if (pointCount > 0) {
			// 分割
			var pathDictKeysGrouped = [];
			pathDictKeys = pathDictKeys.sort();
			var splitPathThreshold = splitPathThresholdSecond();; // s
			var splitToMultiKml = false;
			if (splitPathThreshold < 1)
				pathDictKeysGrouped = [pathDictKeys];
			else {
				var lastTimestamp = 0;
				var lastGroup = undefined;
				splitToMultiKml = $('#split-into-multi-kml:checkbox:checked').length > 0;
				pathDictKeys.forEach(timestamp => {
					if (timestamp - lastTimestamp > splitPathThreshold) {
						lastGroup = new Array();
						pathDictKeysGrouped.push(lastGroup);
					}
					lastGroup.push(timestamp);
					lastTimestamp = timestamp;
				});
			}

			// console.log(pathDictKeysGrouped);

			function kmlGroupContent(pathDict, pathDictKeys, index) {
				var altitude;
				var kml = kmlPlacemarkHead('轨迹' + index, '盯盯拍导出') + kmlTrackHead();
				var timeStr;
				pathDictKeys.forEach(timestamp => {
					g = pathDict[timestamp];
					altitude = 0;
					if ('altitude' in g)
						altitude = g['altitude'];
					timeStr = timestampToString(timestamp, 'yyyy-MM-ddThh:mm:ssZ', timestampOffset);
					kml += kmlTrackCoord(g['lat'], g['lon'], altitude, 6, timeStr);
				});
				kml += kmlTrackTail() + kmlPlacemarkTail();

				var fmt = 'MM月dd日hh时mm分'
				var tsFrom = pathDictKeys[0];
				var tsFromStr = timestampToString(tsFrom, fmt, 0);
				var gpsAtTsFrom = pathDict[tsFrom];
				var filename = '轨迹' + index + ' ' + tsFromStr;
				kml += kmlPlacemarkHead('起点' + index, tsFromStr) + kmlPlacemarkPoint(gpsAtTsFrom['lat'], gpsAtTsFrom['lon'], 6) + kmlPlacemarkTail();
				var duration = '';
				if (pathDictKeys.length > 1) {
					var tsTo = pathDictKeys[pathDictKeys.length - 1];
					var tsToStr = timestampToString(tsTo, fmt, 0);
					filename += '到' + tsToStr;
					duration = '，轨迹持续' + secondToHumanReadableString(tsTo - tsFrom);

					var gpsAtTsTo = pathDict[tsTo];
					kml += kmlPlacemarkHead('终点' + index, tsToStr) + kmlPlacemarkPoint(gpsAtTsTo['lat'], gpsAtTsTo['lon'], 6) + kmlPlacemarkTail();
				}

				return { 'kml': kml, 'filename': filename, 'duration': duration, 'pointCount': pathDictKeys.length };
			}
			var kmlGroupContents = [];
			var kmlGroupContentIndex = 0;
			pathDictKeysGrouped.forEach(keys => {
				kmlGroupContents.push(kmlGroupContent(pathDict, keys, ++kmlGroupContentIndex));
			});

			function appendKmlResult(kmlContent, filename, pointCount, duration) {
				filename += '.kml';
				var blob = new Blob([kmlContent]);
				var newLink = $('<a>', {
					text: filename,
					download: filename,
					href: URL.createObjectURL(blob)
				});

				kmlFileList.append(newLink);
				kmlFileList.append('<br/>文件大小' + byteToHumanReadableSize(blob.size) + '，点位数量' + pointCount + duration + '<br/>');
			}

			if (splitToMultiKml) {
				let kml = undefined;
				let filename = undefined;
				kmlGroupContents.forEach(g => {
					filename = g['filename'];
					kml = kmlHead(filename, '文件夹') + g['kml'] + kmlTail();
					appendKmlResult(kml, filename, g['pointCount'], g['duration']);
				});
			} else {
				var filename = '轨迹-' + timestampToString(pathDictKeys[0], 'MM月dd日hh时mm分', timestampOffset);
				var kml = kmlHead(filename, '文件夹');
				kmlGroupContents.forEach(kmlGroupContent => {
					kml += kmlGroupContent['kml'];
				});
				kml += kmlTail();
				var pointCount = pathDictKeys.length;
				var duration = '';
				if (pointCount > 1)
					duration = '，轨迹持续' + secondToHumanReadableString(pathDictKeys[pointCount - 1] - pathDictKeys[0]);
				appendKmlResult(kml, filename, pointCount, duration);
			}

			// console.log('delete all gpxContents');
			gpxContents = undefined; // clean up
		} else {
			kmlFileList.append($('<a>', {
				text: '轨迹KML内容为空',
				download: filename,
				href: 'javascript:void(0);'
			}));
			kmlFileList.append('<br/>')
		}

		var costTimestampEnd = (new Date()).getTime();
		infoList.append('处理完成，总耗时 ' + (costTimestampEnd - costTimestampBegin) + 'ms<br/>');
	}
}

// 参数idxes为整数的数组
function downloadGpsPaths(idxes) {
	beforeDownloadGpsPaths();

	idxes.forEach(idx => {
		var g = gpsFileListReq[idx];
		g['filename'].forEach(filename => {
			gpxHttpPendingFilenames.push(filename);
			++gpxContentsExpectCount; // gpx+git文件期望个数，须预先在这里设置好
		});
	});

	if (idxes.length > 0) {
		for (var i = 0; i < 4; ++i) // 限制下载连接数
			beginDownloadGpsPath();
	}
}

$('#export-gps-selected').click(function () {
	var checkedBoxes = $("input[name='history-select']:checked");
	var idxes = new Array();

	$.each(checkedBoxes, function () {
		idxes.push(parseInt($(this).val()));
	});

	downloadGpsPaths(idxes);
});

$('#fetch-gps-file-uploaded').click(function () {
	var file = $("#fetch-gps-file-upload")[0].files[0];
	if (file) {
		var filename = file.name;
		$('#entryList').empty();
		var fileReader = new FileReader();
		fileReader.onload = function () {
			beforeDownloadGpsPaths();
			appendGpxContentsFromArrayBuffer(filename, this.result);
		};
		fileReader.readAsArrayBuffer(file);
	} else
		appendError('请先选择上传一个文件');
});

$('#fetch-gps-file-upload').on('change', function () {
	var file = $(this)[0].files[0];
	var filename = file.name;
	var supportedFormats = ['.git', '.rar', '.tar', '.zip'];
	for (var i = 0; i < supportedFormats.length; i++) {
		if (filename.endsWith(supportedFormats[i]))
			return;
	};
	var s = '无效文件名：' + filename + '，仅支持';
	supportedFormats.forEach(f => {
		s += f + ' ';
	});
	s += '格式的压缩包，内含多个gpx文件';
	appendError(s);
});

function appendError(s) {
	var errorList = $('#errorList');
	if (false === errorOccurred) {
		errorList.append('错误信息<br/>');
		errorOccurred = true;
	}
	errorList.append(s + '<br/>');
}

function clearErrors() {
	$('#errorList').empty();
	errorOccurred = false;
}

function copyUrls(row) {
	var text2copy = '';
	var lineCount = 0;
	gpsFileListReq[row]['filename'].forEach(filename => {
		text2copy += serverHostUrl + '/' + filename + '\n';
		++lineCount;
	});

	if (lineCount > 0) {
		if (!navigator.clipboard) {
			// use old commandExec() way
			var $temp = $("<textarea>"); // use textArea instead of input
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
	var inputBox = $('#split-path-threshold');
	var val = parseInt(inputBox.val());
	var minValue = parseInt(inputBox.prop('min'));
	var maxValue = parseInt(inputBox.prop('max'));
	var ratio = scaleToIndex(val, minValue, maxValue, Math.E, 5); // [0,1]
	return Math.abs(Math.trunc(ratio * 86400));
}

$('#split-path-threshold').on("change mousemove", function () {
	var label = $('#split-path-threshold-text');
	var checkBoxMultiKML = $('#split-into-multi-kml-span');
	var second = splitPathThresholdSecond();
	if (second < 1) {
		label.html('无');
		checkBoxMultiKML.css('display', 'none');
	} else {
		label.html(secondToHumanReadableString(second));
		checkBoxMultiKML.css('display', 'inline-block');
	}
});

loadArchiveFormats(['tar', 'rar', 'zip'], function () {
	var button = $('#fetch-gps-file-list');
	button.html("从记录仪获取");
	button.prop('disabled', false);
});

// var interpolate = $('#interpolate:checkbox:checked').length > 0;
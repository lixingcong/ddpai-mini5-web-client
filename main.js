"use strict"

// global vars
// var serverHostUrl = 'http://files.local';
var serverHostUrl = 'http://193.168.0.1';
var serverAjaxTimeout = 10000;

var gpsFileListReq = undefined;
var gpxContents = undefined;
var gpxContentsExpectCount = 0;
var gpxContentsCheckerTimer = undefined;
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

function appendGpxContentsFromArrayBuffer(filename, arrayBuffer) {
	var archive = archiveOpenArrayBuffer(filename, '', arrayBuffer);
	if (archive) {
		archive.entries.forEach(function (entry) {
			if (!entry.is_file) return;
			gpxContentsExpectCount++;
			entry.readData(function (data) {
				var arrayBufReader = new FileReader();
				arrayBufReader.onload = function () {
					var sortKey = parseInt(entry.name.split('_')[0].substr(4));
					gpxContents.push([sortKey, this.result]);
				};
				arrayBufReader.onerror = function () {
					gpxContentsExpectCount--;
				};
				arrayBufReader.readAsText(new Blob([data]));
			});
		});
	}
}

function killGpxContentsCheckerTimer() {
	clearInterval(gpxContentsCheckerTimer);
	gpxContentsCheckerTimer = undefined;
}

function checkGpxConetentUseTimer() {
	infoCounter = 0;
	gpxContentsCheckerTimer = setInterval(function () {
		var infoList = $('#infoList');

		infoList.html('#' + (++infoCounter) + ' 轨迹文件数(' + gpxContents.length + '/' + gpxContentsExpectCount + '), 剩余HTTP请求' + gpxHttpPendingFilenames.length + '<br/>');
		if (gpxHttpPendingFilenames.length === 0 && gpxContentsExpectCount <= gpxContents.length) {
			killGpxContentsCheckerTimer();

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
				pathDictKeys = pathDictKeys.sort();

				var altitude;
				var kmlCoords = kmlPlacemarkHead('轨迹', '盯盯拍导出') + kmlTrackHead();
				var timeStr;
				pathDictKeys.forEach(k => {
					g = pathDict[k];
					altitude = 0;
					if ('altitude' in g)
						altitude = g['altitude'];
					timeStr = timestampToString(k, 'yyyy-MM-ddThh:mm:ssZ', timestampOffset);
					kmlCoords += kmlTrackCoord(g['lat'], g['lon'], altitude, 6, timeStr);
				});
				kmlCoords += kmlTrackTail() + kmlPlacemarkTail();

				var fmt = 'MM月dd日hh时mm分'
				var tsFrom = pathDictKeys[0];
				var tsFromStr = timestampToString(tsFrom, fmt, 0);
				var gpsAtTsFrom = pathDict[tsFrom];
				var filename = '轨迹' + tsFromStr;
				var kmlPlaceMarks = kmlPlacemarkHead('起点', tsFromStr) + kmlPlacemarkPoint(gpsAtTsFrom['lat'], gpsAtTsFrom['lon'], 6) + kmlPlacemarkTail();
				if (pathDictKeys.length > 1) {
					var tsTo = pathDictKeys[pathDictKeys.length - 1];
					var tsToStr = timestampToString(tsTo, fmt, 0);
					filename += '到' + tsToStr;

					var gpsAtTsTo = pathDict[tsTo];
					kmlPlaceMarks += kmlPlacemarkHead('终点', tsToStr) + kmlPlacemarkPoint(gpsAtTsTo['lat'], gpsAtTsTo['lon'], 6) + kmlPlacemarkTail();
				}
				var kml = kmlHead(filename, '文件夹') + kmlPlaceMarks + kmlCoords + kmlTail();
				//console.log(kml);

				filename += '.kml';
				var blob = new Blob([kml]);
				var newLink = $('<a>', {
					text: filename,
					download: filename,
					href: URL.createObjectURL(blob)
				});

				kmlFileList.append(newLink);
				kmlFileList.append('<br/>文件大小' + blob.size + '字节，点位数量' + pointCount);

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
	}, 100);
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
				innerHtml += '<thead><tr><th>轨迹时间 URL</th><th>git</th><th>gpx</th><th>' + multiSelect + '</th><th>单选</th></tr></thead>\n';
				innerHtml += '<tbody>\n';
				var row = 0;
				var from, fromHref, to, button, checkBox, gitCount, gpxCount;
				gpsFileListReq.forEach(g => {
					from = timestampToString(g['from'], fmt, timestampOffset);
					to = timestampToString(g['to'], fmt, timestampOffset);
					gitCount = g['git'];
					gpxCount = g['gpx'];

					fromHref = '<a href="javascript:copyUrls(' + row + ')">' + from + '</a>';
					button = '<button class="btn-download-single" value="' + row + '">下载</button>';
					checkBox = '<label><input type="checkbox" value="' + row + '" name="history-select" checked="true">选择</label>';
					innerHtml += '<tr><td>' + fromHref + '<br/>' + to + '</td>' + '<td>' + (gitCount > 0 ? gitCount : '') + '</td>' + '<td>' + (gpxCount > 0 ? gpxCount : '') + '</td><td>' + checkBox + '</td><td>' + button + '</td></tr>\n';
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
	if (gpxContentsCheckerTimer !== undefined) {
		clearInterval(gpxContentsCheckerTimer);
		gpxContentsCheckerTimer = undefined;
	}

	gpxContents = new Array();
	gpxContentsExpectCount = 0;
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
				} else {
					gpxContentsExpectCount++;
					fileReader.onload = function () {
						var sortKey = parseInt(filename.split('_')[0].substr(4));
						gpxContents.push([sortKey, this.result]);
					};
					fileReader.onerror = function () {
						gpxContentsExpectCount--;
					};
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

// 参数idxes为整数的数组
function downloadGpsPaths(idxes) {
	beforeDownloadGpsPaths();

	idxes.forEach(idx => {
		var g = gpsFileListReq[idx];
		g['filename'].forEach(filename => {
			gpxHttpPendingFilenames.push(filename);
		});
	});

	if (idxes.length > 0) {
		checkGpxConetentUseTimer(); // 此步骤须早于执行ajax
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
	//console.log(file);
	var filename = file.name;
	$('#entryList').empty();
	var fileReader = new FileReader();
	fileReader.onload = function () {
		beforeDownloadGpsPaths();
		appendGpxContentsFromArrayBuffer(filename, this.result);
		checkGpxConetentUseTimer();
	};
	fileReader.readAsArrayBuffer(file);
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

loadArchiveFormats(['tar', 'rar', 'zip'], function () {
	var button = $('#fetch-gps-file-list');
	button.html("从记录仪获取");
	button.prop('disabled', false);
});

// var interpolate = $('#interpolate:checkbox:checked').length > 0;
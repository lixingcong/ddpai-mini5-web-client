"use strict"

// global vars
var gpsFileList = undefined;
// var serverHostUrl = 'http://files.local';
var serverHostUrl = 'http://193.168.0.1';
var gpxContents = undefined;
var gpxContentsExpectCount = 0;
var gpxHttpPendingCount = 0;
var gpxContentsCheckerTimer = undefined;
var dateObj = new Date();
var timestampOffset = dateObj.getTimezoneOffset() * 60000;
var errorOccurred = false;
var tableMulitselStatus=true;

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

$('#fetch-gps-file-list').click(function () {
	var entryList = $('#entryList');
	entryList.empty();
	gpsFileList = undefined;
	clearErrors();
	tableMulitselStatus=true;

	// var url = serverHostUrl + '/g.php';
	var url = serverHostUrl + '/cmd.cgi?cmd=API_GpsFileListReq';
	$.ajax({
		type: 'GET',
		url: url,
		timeout: 3000,
		success: function (response) {
			gpsFileList = API_GpsFileListReqToArray(response);
			if (gpsFileList.length > 0) {
				var fmt = 'MM月dd日 hh:mm';
				var innerHtml = '<table>\n';
				var multiSelect= '<a href="javascript:void(0)" id="table-multiselect-href">多选</a>';
				innerHtml += '<thead><tr><th>单选</th><th>'+multiSelect+'</th><th>时间段</th><th>git</th><th>gpx</th></tr></thead>\n';
				innerHtml += '<tbody>\n';
				var row = 0;
				var from, to, button, checkBox;
				gpsFileList.forEach(g => {
					from = timestampToString(g['from'], fmt, timestampOffset);
					to = timestampToString(g['to'], fmt, timestampOffset);
					button = '<button class="btn-download-single" value="' + row + '">下载</button>';
					checkBox = '<label><input type="checkbox" value="' + row + '" name="history-select">选择</label>';
					innerHtml += '<tr><td>' + button + '</td><td>' + checkBox + '</td>' + '<td>' + from + '<br/>' + to + '</td>' + '<td>' + g['git'] + '</td>' + '<td>' + g['gpx'] + '</td></tr>\n';
					row++;
				});
				innerHtml += '</tbody>\n';
				innerHtml += '</table>\n';
				entryList.html(innerHtml);

				$('.btn-download-single').click(function () {
					var idxes = [$(this).val()];
					downloadGpsPaths(idxes);
				});
				$('#table-multiselect-href').on('click',function(){
					var boxes = $("input[name='history-select']");
					$.each(boxes, function () {
						$(this).prop('checked', tableMulitselStatus);
					});
					tableMulitselStatus=!tableMulitselStatus;
				});
			} else {
				entryList.html('GPS file list from server is empty!');
			}
		},
		error: function () {
			appendError('Failed to download ' + url);
		},
		abort: function () {
			appendError('Abort to download ' + url);
		},
		timeout: function () {
			appendError('Timeout to download ' + url);
		}
	});
});

// 参数idxes为整数的数组
function downloadGpsPaths(idxes) {
	if (gpxContentsCheckerTimer !== undefined) {
		clearInterval(gpxContentsCheckerTimer);
		gpxContentsCheckerTimer = undefined;
	}

	gpxContents = new Array();
	gpxContentsExpectCount = 0;
	gpxHttpPendingCount = 0;
	var kmlFileList = $('#kmlFileList');
	kmlFileList.empty();
	var infoList = $('#infoList');
	infoList.empty();

	idxes.forEach(idx => {
		var g = gpsFileList[idx];
		g['filename'].forEach(filename => {
			var url = serverHostUrl + '/' + filename;
			gpxHttpPendingCount++;
			$.ajax({
				type: 'GET',
				url: url,
				xhrFields: {
					responseType: 'blob'
				},
				timeout: 3000,
				success: function (response) {
					var fileReader = new FileReader();
					if (filename.endsWith('.git')) {
						// tar file
						fileReader.onload = function () {
							var array_buffer = this.result;
							var archive = archiveOpenArrayBuffer("1.tar", '', array_buffer);
							if (archive) {
								var archiveEntryCount = archive.entries.length;
								gpxContentsExpectCount += archiveEntryCount;
								archive.entries.forEach(function (entry) {
									if (!entry.is_file) return;;
									entry.readData(function (data) {
										var arrayBufReader = new FileReader();
										arrayBufReader.onload = function () {
											var sortKey = parseInt(entry.name.split('_')[0].substr(4));
											gpxContents.push([sortKey, this.result]);
										};
										arrayBufReader.readAsText(new Blob([data]));
									});
								});
							}
						};
						fileReader.readAsArrayBuffer(response);
					} else {
						gpxContentsExpectCount++;
						fileReader.onload = function () {
							var sortKey = parseInt(filename.split('_')[0].substr(4));
							gpxContents.push([sortKey, this.result]);
						};
						fileReader.readAsText(response);
					}
				},
				error: function () {
					appendError('Failed to download ' + url);
				},
				abort: function () {
					appendError('Abort to download ' + url);
				},
				timeout: function () {
					appendError('Timeout to download ' + url);
				},
				complete: function () {
					//await sleep(2000);
					gpxHttpPendingCount--;
				}
			});
		});
	});

	if (idxes.length > 0) {
		gpxContentsCheckerTimer = setInterval(function () {
			if (gpxHttpPendingCount === 0 && gpxContentsExpectCount <= gpxContents.length) {
				gpxContents.sort(function (a, b) {
					return a[0] > b[0] ? 1 : -1;
				});
				// console.log(gpxContents);
				var pathDict = {};
				var convertedDict;
				gpxContents.forEach(gpx => {
					convertedDict = gpxToPathDict(gpx[1], 150, '\n');
					console.log(convertedDict);
					pathDict = Object.assign({}, pathDict, convertedDict);
				});
				// console.log(pathDict);

				var pathDictKeys = [];
				var g;
				Object.keys(pathDict).forEach(k => {
					g = pathDict[k];
					if (('lat' in g) && ('lon' in g))
						pathDictKeys.push(k);
				});

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
						kmlPlaceMarks = kmlPlacemarkHead('终点', tsToStr) + kmlPlacemarkPoint(gpsAtTsTo['lat'], gpsAtTsTo['lon'], 6) + kmlPlacemarkTail();
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
				} else {
					kmlFileList.append('轨迹KML内容为空<br/>');
				}

				// clean up
				clearInterval(gpxContentsCheckerTimer);
				gpxContentsCheckerTimer = undefined;
				gpxContents = undefined;
				infoList.empty();
			} else {
				infoList.html('工作中...轨迹文件数(' + gpxContents.length + '/' + gpxContentsExpectCount + '), 剩余HTTP请求' + gpxHttpPendingCount);
			}
		}, 100);
	}
}

$('#export-gps-merged-coord').click(function () {
	var checkedBoxes = $("input[name='history-select']:checked");
	var idxes = new Array();

	$.each(checkedBoxes, function () {
		idxes.push(parseInt($(this).val()));
	});

	downloadGpsPaths(idxes);
});

$('#export-gps-merged-multicoord').click(function () {
	var interpolate = $('#interpolate:checkbox:checked').length > 0;
	alert('暂未实现! interpolate=' + interpolate);
});

function appendError(s) {
	errorList = $('#errorList');
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

// Load tar only
loadArchiveFormats(['tar'], function () {
	var button = $('#fetch-gps-file-list');
	button.html("获取轨迹");
	button.prop('disabled', false);
});
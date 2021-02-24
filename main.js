// global vars
var gpsFileList = undefined;
// var serverHostUrl = 'http://files.local';
var serverHostUrl='http://193.168.0.1';
var gpxContents = undefined;
var gpxContentsExpectCount = 0;
var gpxContentsCheckerTimer = undefined;
var dateObj = new Date();
var timestampOffset = dateObj.getTimezoneOffset() * 60000;

Date.prototype.format = function (fmt) {
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

function timestampToString(ts, fmt) {
	dateObj.setTime(ts * 1000 + timestampOffset);
	return dateObj.format(fmt);
}

$('#fetch-gps-file-list').click(function () {
	var entryList = $('#entryList');
	entryList.empty();
	gpsFileList = undefined;
	$('#export-gps-merged').prop('disabled', true);

	var url = serverHostUrl + '/g.php';
	// var url = serverHostUrl+'/cmd.cgi?cmd=API_GpsFileListReq';
	$.ajax({
		type: 'GET',
		url: url,
		success: function (response) {
			gpsFileList = API_GpsFileListReqToArray(response);
			if (gpsFileList.length > 0) {
				var fmt = 'MM月dd日 hh:mm';
				var innerHtml = '<table>\n';
				innerHtml += '<thead><tr><th>单选</th><th>多选</th><th>时间段</th><th>git</th><th>gpx</th></tr></thead>\n';
				innerHtml += '<tbody>\n';
				var row = 0;
				gpsFileList.forEach(g => {
					from = timestampToString(g['from'], fmt);
					to = timestampToString(g['to'], fmt);
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
				$('#export-gps-merged').prop('disabled', false);
			} else {
				entryList.html('GPS file list is empty!');
			}
		},
		error: function () {
			console.error("Failed to download file with status: ", status);
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
	kmlFileList = $('#kmlFileList');
	kmlFileList.empty();

	idxes.forEach(idx => {
		var g = gpsFileList[idx];
		g['filename'].forEach(filename => {
			var url = serverHostUrl + '/' + filename;
			$.ajax({
				type: 'GET',
				url: url,
				xhrFields: {
					responseType: 'blob'
				},
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
				}
			});
		});
	});

	if (idxes.length > 0) {
		gpxContentsCheckerTimer = setInterval(function () {
			if (gpxContentsExpectCount <= gpxContents.length) {
				gpxContents.sort(function (a, b) {
					return a[0] > b[0] ? 1 : -1;
				});
				//console.log(gpxContents);
				var pathDict = {};
				gpxContents.forEach(gpx => {
					pathDict = Object.assign({}, pathDict, gpxToPathDict(gpx[1], 150, '\n'));
				});

				var pathDictKeys = Object.keys(pathDict).sort();
				if (pathDictKeys.length > 0) {
					var kml = kmlHead('MyPath');
					pathDictKeys.forEach(k => {
						g = pathDict[k];
						kml += kmlCoord(g['lat'], g['lon'], g['altitude'], 6) + ' ';
					});
					kml += kmlTail();
					//console.log(kml);

					var fmt = 'MM月dd日hh时mm分'
					tsFrom = pathDictKeys[0];
					tsTo = pathDictKeys[pathDictKeys.length - 1];
					filename = '轨迹' + timestampToString(tsFrom, fmt) + '到' + timestampToString(tsTo, fmt) + '.kml';

					var newLink = $('<a>', {
						text: filename,
						download: filename,
						href: URL.createObjectURL(new Blob([kml]))
					});
					kmlFileList.append(newLink);
				}

				// clean up
				clearInterval(gpxContentsCheckerTimer);
				gpxContentsCheckerTimer = undefined;
				gpxContents = undefined;
			} else {
				console.log('continue check, gpxContents.length=' + gpxContents.length + ', expect length=' + gpxContentsExpectCount);
			}
		}, 500);
	}
}

$('#export-gps-merged').click(function () {
	var checkedBoxes = $("input[name='history-select']:checked");
	var idxes = new Array();

	$.each(checkedBoxes, function () {
		idxes.push(parseInt($(this).val()));
	});

	downloadGpsPaths(idxes);
});

// Load tar only
loadArchiveFormats(['tar'], function () {
	var button = $('#fetch-gps-file-list');
	button.html("获取所有轨迹信息");
	button.prop('disabled', false);
});
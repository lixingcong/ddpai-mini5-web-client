"use strict"

import * as DDPAI from './ddpai.js';
import * as RD from './RequestDecorator.js';
import * as TRACK from './track.js';
import * as DF from './date-format.js';
import * as UTILS from './utils.js';

// export to global window scope
window.exportToTrack = exportToTrack;
window.selectHistoryRows = selectHistoryRows;
window.copyUrls = copyUrls;

// global vars
const serverHostUrl = 'http://193.168.0.1';
const urlAPIGpsFileListReq = serverHostUrl + '/cmd.cgi?cmd=API_GpsFileListReq';
// const serverHostUrl = 'http://files.local';
// const urlAPIGpsFileListReq = serverHostUrl + '/g.php';

// 数据处理的顺序：
// 1. 先发起HTTP请求，文件名列表存入gpsFileListReq
// 2. 遍历g_gpsFileListReq数组，从HTTP下载所有的git、gpx文件，存入到g_gpxPreprocessContents，作为预处理中间结果
// 3. 当所有g_gpxPreprocessContents下载完毕时，合并这些内容，并按键值存入到g_wayPoints，此时g_gpxPreprocessContents被清空
// 4. 当用户点击“导出轨迹”按钮时，动态地从g_wayPoints中取出点位并生成轨迹文件blob二进制，可以直接下载
var g_gpsFileListReq = []; // 数组，HTTP链接，每个gpx/git的直链
var g_gpxPreprocessContents = {}; // 字典，为json中的startTime到gpx原文件内容的映射（只保留GPGGA和GPRMC行）
var g_timestampToWayPoints = {}; // 字典，为timestamp到WayPoint对象的映射

// miscs
var errorCount = 0;
var tableMulitselStatus = true;

// params
const TrackFileNameFormat = 'yyyyMMdd-hhmm'; // 文件名日期格式，不能含特殊字符，如冒号
const WayPointDescriptionFormat = 'yyyy-MM-dd hh:mm'; // 描述一个点的注释日期格式
const HtmlTableFormat = 'MM-dd hh:mm'; // HTML网页中的日期格式

function isMobileUserAgent() {
	return /Android|webOS|iPhone|iPad|Mac|Macintosh|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

$('#fetch-gps-file-list').click(function () {
	let entryList = $('#entryList');
	entryList.empty();
	g_gpsFileListReq = [];
	clearErrors();
	tableMulitselStatus = true;

	promiseHttpGetAjax(urlAPIGpsFileListReq).then((response) => {
		g_gpsFileListReq = DDPAI.API_GpsFileListReqToArray(response);
		if (g_gpsFileListReq.length > 0) {
			const groupGpsFileListReq = () => {
				let grouped = {};
				g_gpsFileListReq.forEach((g, idx) => {
					let from = g['from'];
					let fromDateStr = DF.timestampToString(from, 'MM-dd', false);
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
					const ta = g_gpsFileListReq[a]['from'];
					const tb = g_gpsFileListReq[b]['from'];
					return ta - tb; // oldest date first
				});

				const idxCount = idxes.length;
				for (let i = 0; i < idxCount; ++i) {
					const idx = idxes[i];
					const g = g_gpsFileListReq[idx];
					from = g['from'];
					to = g['to'];

					innerHtml += '<tr>';
					if (0 == i) {
						const weekdayStr = DF.timestampToString(from, 'ww', false);
						const selectDateRows = '<a href="javascript:selectHistoryRows([' + idxes.join(',') + '], false, true)">' + k + '</a>' + '</br>' + weekdayStr;
						innerHtml += '<td rowspan="' + idxCount + '" style="vertical-align:top;">' + selectDateRows + '</td>';
					}

					duration = UTILS.secondToHumanReadableString(to - from);
					from = DF.timestampToString(from, HtmlTableFormat, false);
					to = DF.timestampToString(to, HtmlTableFormat, false);

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
				const values = Array.from({ length: g_gpsFileListReq.length }, (_, i) => i);
				const valuesTrue = values.filter(i => i === thisVal);
				const valuesFalse = values.filter(i => i !== thisVal);
				selectHistoryRows(valuesTrue, true);
				selectHistoryRows(valuesFalse, false);
				tableMulitselStatus = true;
			});

			$('#table-multiselect-href').on('click', function () {
				let values = Array.from({ length: g_gpsFileListReq.length }, (_, i) => i);
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

function isFilenameGpxGit(filename) {
	return filename.search(/\d{14}_\d{4}(_D|_T)?\.g(px|it)/i) >= 0;
}

function exportToTrack(singleFile) {
	const costTimestampBegin = DF.now();
	const timestamps = Object.keys(g_timestampToWayPoints).sort(); // 按时间排序

	const exportedTrackList = $('#exportedTrackList');
	exportedTrackList.empty();
	$('#infoList').empty();
	if (timestamps.length > 0) {
		// 按时间差分阈值分割完毕的结果
		let timestampsGrouped = UTILS.splitOrderedNumbersByThreshold(timestamps, splitPathThresholdSecond());

		function appendTrackResult(trackContent, filename, pointCount, tsFrom, tsTo, trackDistance) {
			let blob = new Blob([trackContent]);
			let newLink = $('<a>', {
				text: filename,
				download: filename,
				href: URL.createObjectURL(blob)
			});

			exportedTrackList.append(newLink);
			let trackHint = '<br/>' + UTILS.byteToHumanReadableSize(blob.size) + '，' + pointCount + '点';
			const duration = tsTo - tsFrom;
			if (duration > 0) {
				trackHint += '，耗时' + UTILS.secondToHumanReadableString(duration);
				const wp1 = g_timestampToWayPoints[tsFrom];
				const wp2 = g_timestampToWayPoints[tsTo];
				trackHint += '，直线' + UTILS.meterToString(wp1.distanceTo(wp2));
				if(trackDistance > 0)
					trackHint += '，里程' + UTILS.meterToString(trackDistance);
			}
			exportedTrackList.append(trackHint + '<br/>');
		}

		const fileNameTsFromTo = (a, b) => {
			return DF.timestampToString(a, TrackFileNameFormat, false) + '到' + DF.timestampToString(b, TrackFileNameFormat, false);
		}

		const descriptionTsFromTo = (a, b) => {
			return DF.timestampToString(a, WayPointDescriptionFormat, false) + '到' + DF.timestampToString(b, WayPointDescriptionFormat, false);
		}

		const ExportFormat = $('select#select-export-format').find(":selected").val();
		const EnableTrack = $('#enable-export-track').prop('checked');
		const EnableLine = $('#enable-export-line').prop('checked');

		if (singleFile) {
			// singleFile = true表示单个文件，内含N条轨迹
			let trackHint = '';
			let tsFrom = Number.MAX_SAFE_INTEGER;
			let tsTo = Number.MIN_SAFE_INTEGER;
			const simpleTimestampToString = (a, b) => DF.timestampToString(a, HtmlTableFormat, false) + '~' + DF.timestampToString(b, HtmlTableFormat, false);
			const ZeroPadLength = UTILS.intWidth(timestampsGrouped.length);
			let tracks = [];
			timestampsGrouped.forEach((timestamps, idx) => {
				const wayPoints = timestamps.map((ts) => g_timestampToWayPoints[ts]);
				let track = new TRACK.Track(wayPoints);
				tracks.push(track);

				const WayPointFrom = wayPoints[0];
				const WayPointTo = wayPoints[wayPoints.length-1];

				const readableIdx = UTILS.zeroPad(idx + 1, ZeroPadLength); // 2 -> '00000000002'
				trackHint += '轨迹' + readableIdx + '，' + simpleTimestampToString(WayPointFrom.timestamp, WayPointTo.timestamp) + '，' + UTILS.secondToHumanReadableString(WayPointTo.timestamp - WayPointFrom.timestamp);
				trackHint += '，直线' + UTILS.meterToString(WayPointFrom.distanceTo(WayPointTo));
				trackHint += '，里程' + UTILS.meterToString(track.distance) + '<br>';

				if (tsFrom > WayPointFrom.timestamp)
					tsFrom = WayPointFrom.timestamp;
				if (tsTo < WayPointTo.timestamp)
					tsTo = WayPointTo.timestamp;
			});

			const Filename = fileNameTsFromTo(tsFrom, tsTo) + '共' + timestampsGrouped.length + '条.' + ExportFormat;
			const FileDesciption = descriptionTsFromTo(tsFrom, tsTo) + '共' + timestampsGrouped.length + '条';
			const TrackContent = TRACK.toFile(tracks, ExportFormat, FileDesciption, EnableTrack, EnableLine, WayPointDescriptionFormat);
			appendTrackResult(TrackContent, Filename, timestamps.length, tsFrom, tsTo, 0);
			exportedTrackList.append(trackHint);
		} else {
			// singleFile = false表示每个文件只含1条轨迹
			timestampsGrouped.forEach((timestamps) => {
				const wayPoints = timestamps.map((ts) => g_timestampToWayPoints[ts]);
				let track = new TRACK.Track(wayPoints);

				const TsFrom = wayPoints[0].timestamp;
				const TsTo = wayPoints[wayPoints.length-1].timestamp;
				const Filename = fileNameTsFromTo(TsFrom, TsTo) + '.' + ExportFormat;
				const FileDesciption = descriptionTsFromTo(TsFrom, TsTo);
				const TrackContent = TRACK.toFile([track], ExportFormat, FileDesciption, EnableTrack, EnableLine, WayPointDescriptionFormat);
				appendTrackResult(TrackContent, Filename, wayPoints.length, TsFrom, TsTo, track.distance);
			});
		}
	} else {
		exportedTrackList.append($('<a>', {
			text: '轨迹内容为空白',
			href: 'javascript:void(0);'
		}));
		exportedTrackList.append('<br/>');
	}

	infoList.append('导出轨迹完成，耗时 ' + (DF.now() - costTimestampBegin) + 'ms');
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
		const p = DDPAI.preprocessRawGpxFile(textData, 160, '\n');
		if(!UTILS.isObjectEmpty(p))
			g_gpxPreprocessContents[p['startTime']] = p['content'];
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
			const readFileDecorator = new RD.RequestDecorator({
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
	g_timestampToWayPoints = {};
	g_gpxPreprocessContents = {};
	$('#exportedTrackList').empty();
	$('#infoList').empty();
	clearErrors();
	setProgress(-1);
}

function mergePreprocessed(){
	// merge all preprocess gpx file content into a single dict
	let gpxPreprocessTimestamps = Object.keys(g_gpxPreprocessContents);
	gpxPreprocessTimestamps.sort();
	let concated = [];
	gpxPreprocessTimestamps.forEach(ts => { concated = concated.concat(g_gpxPreprocessContents[ts]); });
	g_timestampToWayPoints = DDPAI.gpxToWayPointDict(concated);
	g_gpxPreprocessContents = {}; // clean up
}

// 参数idxes为整数的数组
function downloadGpsPaths(idxes) {
	let costTimestampBegin = DF.now();
	beforeDownloadGpsPaths();

	const requestInstance = new RD.RequestDecorator({
		maxLimit: 4,
		requestApi: promiseHttpGetAjax
	});

	let promises = [];
	idxes.forEach(idx => {
		let g = g_gpsFileListReq[idx];
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
		refreshDownloadProgress(DF.now() - costTimestampBegin);
	});
}

$('.set-gpx-src').click(function () {
	// before download Gps Paths
	g_timestampToWayPoints = {};
	g_gpxPreprocessContents = {};
	$('#exportedTrackList').empty();
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
		let costTimestampBegin = DF.now();
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
			refreshDownloadProgress(DF.now() - costTimestampBegin);
		});
	}
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
	const pointCount = (costTime >= 0 ? Object.keys(g_timestampToWayPoints).length : Object.keys(g_gpxPreprocessContents).length);
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
		g_gpsFileListReq[r]['filename'].forEach(filename => {
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

function splitPathThresholdSecond() {
	let inputBox = $('#split-path-threshold');
	let val = parseInt(inputBox.val());
	let minValue = parseInt(inputBox.prop('min'));
	let maxValue = parseInt(inputBox.prop('max'));
	let ratio = UTILS.scaleToIndex(val, minValue, maxValue, Math.E, 5); // [0,1]
	return Math.abs(Math.trunc(ratio * 86400));
}

function updateSplitPathThresholdText() {
	let label = $('#split-path-threshold-text');
	let second = splitPathThresholdSecond();
	if (second < 1) {
		label.html('不分割');
	} else {
		label.html(UTILS.secondToHumanReadableString(second));
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

loadArchiveFormats(['tar'], function () {
	let button = $('#fetch-gps-file-list');
	button.html("从记录仪获取");
	button.prop('disabled', false);
});

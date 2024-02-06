"use strict"

import * as DF from './date-format.js'
import * as TRACK from './track.js'
import * as KML from './kml.js';
import * as GPX from './gpx.js';
import * as UTILS from './utils.js';
import * as TL from './track-links.js';
// import * as WP from './waypoint.js';

window.list_all_files=list_all_files;

var g_errorCount = 0;
var g_fileCount = 0;
var g_files = []; // MyFile对象
var g_enableBeautify = false; // 是否启用美化
var g_forceConvert = false; // 是否强制转相同格式
var g_trackFileHookScript = undefined;
var g_useTrackFileHook = false;
var g_canvasWidth = TL.CanvasDefaultWidth;
var g_canvasHeight = TL.CanvasDefaultHeight;

class MyFile
{
    constructor(name)
    {
        this.name = name;
        this.content = undefined;
        this.keepSameFormat = false; // 当目标格式与源格式相同时，保持原样，无需转换
        this.trackFile = undefined;
    }
}

const appendFile = myFile => {
    g_files.push(myFile);
    setProgress(g_files.length / g_fileCount); // 始终达不到100%，最后需要压缩表示100
}

$('#convert').click(function () {
    const costTimestampBegin = DF.now();
    const srcFiles = $("#select-files")[0].files;
    const fileCount = srcFiles.length;

    if(fileCount<1)
    {
        appendError('请至少上传一个文件');
		return;
    }

    // reset status
    g_fileCount=fileCount;
    g_files=[];
    setProgress(0);
    clearErrors();

    const exportedTrackList = $('#exportedTrackList');
    exportedTrackList.empty();

    const infoList=$('#infoList')
    infoList.empty();

    g_enableBeautify = $('#enable-export-beautify').prop('checked');
    g_forceConvert = $('#force-convert-same-fmt').prop('checked');
    g_useTrackFileHook = $('#use-trackfile-hook').prop('checked');
    g_canvasWidth = parseInt($('#canvas-width').val());
    g_canvasHeight = parseInt($('#canvas-height').val());
    const DestFileFormat = $('select#select-convert-format').find(":selected").val();

    // Remove custom hook
    if(g_trackFileHookScript){
        document.head.removeChild(g_trackFileHookScript);
        g_trackFileHookScript=undefined;
    }

    // Load custom hook
    if(g_useTrackFileHook){
        g_trackFileHookScript = document.createElement('script');
        const trackFileHook=$('#trackfile-hook-func').val();
        g_trackFileHookScript.appendChild(document.createTextNode('window.trackFileHook='+trackFileHook+';'));
        document.head.appendChild(g_trackFileHookScript);
    }

    let promises = [];
    for(let i=0;i<fileCount;++i){
        const f = srcFiles[i];

        promises.push(promiseReadBlob(f).then(myFile => {
            return promiseConvertFormat(myFile, DestFileFormat).then(myFile => {
                appendFile(myFile);
            })
        }));
    }

    Promise.allSettled(promises).then(function (results) {
		results.forEach(r => {
			if (r.status === 'rejected') {
				appendError(r.reason);
			}
		});

        g_files = g_files.filter(myFile => { return myFile && undefined != myFile.content; });
        g_files.sort((a, b) => a.name.localeCompare(b.name)); // 按文件名排序

        let stat = {
            converted: 0,
            same: 0,
        };

        if(g_files.length > 0){
            const zipHint = '转换'+DestFileFormat+'合辑_'+DF.timestampToString(costTimestampBegin / 1000, 'yyyyMMdd-hhmmss');
            const zip = new JSZip();
            const zipFolder = zip.folder(zipHint);

            g_files.forEach(myFile => {
                zipFolder.file(myFile.name, myFile.content);

                if (myFile.keepSameFormat)
                    ++stat.same;
                else
                    ++stat.converted;
            });

            const zipBlob = zip.generate({
                compression: "DEFLATE",
                compressionOptions : {level:6},
                type: "blob",
                platform: "DOS",
                mimeType: 'application/zip'
            });

            exportedTrackList.append(TL.newDownloadLinkDiv(zipBlob, zipHint+'.zip'));

            const divPreview = $('<div>');
            divPreview.append($('<button>', {
                text: '预览压缩包',
                onclick: 'list_all_files(this)'
            }));
            exportedTrackList.append(divPreview);
        } else {
            exportedTrackList.append($('<a>', {
                text: 'Zip文件内容为空白',
                href: 'javascript:void(0);'
            }));
            exportedTrackList.append('<br/>');
        }

		setProgress(1);

        infoList.append('源数目: '+g_fileCount+', 已转换: '+stat.converted+ ', 无需转换: '+  stat.same + '<br/>耗时'+ UTILS.millisecondToHumanReadableString(DF.now() - costTimestampBegin));
	});
});

$('#use-trackfile-hook').change(function(){
    const checked = $('#use-trackfile-hook').prop('checked');
    const textArea = $('#trackfile-hook-func');
    if(checked)
        textArea.show();
    else
        textArea.hide();
});

function clearErrors() {
	$('#errorListHeader').css('display', 'none');
	$('#errorListBody').empty();
	g_errorCount = 0;
}

function appendError(s) {
	if (g_errorCount <= 0) {
		$('#errorListHeader').css('display', 'inline-block');
	}

	++g_errorCount;
	$('#errorCount').html(g_errorCount);
	$('#errorListBody').append(g_errorCount + ': ' + s + '<br/>');
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

function list_all_files(btn)
{
    btn.remove();
    const exportedTrackList=$('#exportedTrackList');

    g_files.forEach((myFile) => {
        const divRoot = TL.newRootDiv();
        exportedTrackList.append(divRoot);

        const paths = myFile.trackFile.lines.concat(myFile.trackFile.tracks);
        const paintResult = TRACK.paint(paths, g_canvasWidth, g_canvasHeight);
        divRoot.append(TL.newCanvasDiv(paintResult.points, true, g_canvasWidth, g_canvasHeight));

        const divLink=TL.newDownloadLinkDiv(new Blob([myFile.content]), myFile.name);
        divLink.append($('<div>', {
            text: '点位' + myFile.trackFile.points.length + '，路径' + myFile.trackFile.lines.length +
             '，轨迹' + myFile.trackFile.tracks.length + (myFile.keepSameFormat?'，未转换':'')
        }));
        divLink.append($('<div>', {
            text: '比例尺：' + UTILS.meterToString(paintResult.horizontalDistance)+'×'+UTILS.meterToString(paintResult.verticalDistance)
        }))
        divRoot.append(divLink);
    });
}

loadArchiveFormats(['zip'], function () {
	let button = $('#convert');
	button.html("执行转换");
	button.prop('disabled', false);
});

// ---- promise 1 ----
const promiseReadBlob = blob => new Promise(function (resolve, reject) {
    // API: resolve(MyFile)
    const reader = new FileReader();
    reader.onload = () => {
        let f = new MyFile(blob.name);
        f.content = reader.result;
        resolve(f);
    };
    reader.onerror = reject;
    reader.onabort = reject;
    reader.readAsText(blob);
});

const promiseConvertFormat = (myFile, destFormat) => new Promise(function(resolve, reject) {
    // API: resolve(MyFile)
    const srcName = myFile.name;
    const srcNameSplited = srcName.split('.');
    if(srcNameSplited.length<2){
        reject(new Error('Invalid file extension: ' + srcName));
        return;
    }

    const srcExtName = srcNameSplited[srcNameSplited.length-1].toLowerCase(); // 取出扩展名

    // set new name
    const srcRawNameLength = srcName.length - srcExtName.length;
    const srcRawName = srcName.substring(0, srcRawNameLength);
    myFile.name=srcRawName+destFormat;

    switch(srcExtName){
        case 'kml':
            const kmlDoc = KML.Document.fromFile(myFile.content);
            if(kmlDoc)
                myFile.trackFile=TRACK.TrackFile.fromKMLDocument(kmlDoc);
            break;
        case 'gpx':
            const gpxDoc = GPX.Document.fromFile(myFile.content);
            if(gpxDoc)
                myFile.trackFile=TRACK.TrackFile.fromGPXDocument(gpxDoc);
            break;
        default:
            reject(new Error('Unsupport file extension: ' + srcExtName + ' of ' + srcName));
            return;
    }

    if(undefined==myFile.trackFile){
        reject(new Error('Failed to build TrackFile object: ' + srcName));
        return;
    }

    // skip if has same format
    if(false == g_forceConvert && srcExtName == destFormat){
        myFile.keepSameFormat = true;
        resolve(myFile);
        return; // No need for convert
    }

    let keepTheFile = true;
    if(g_useTrackFileHook && window.trackFileHook)
        keepTheFile = window.trackFileHook(myFile.trackFile);

    if(!keepTheFile){
        reject(new Error('Removed by hook: ' + srcName));
        return;
    }

    switch(destFormat){
        case 'kml':
            myFile.content = myFile.trackFile.toKMLDocument().toFile(g_enableBeautify);
            break;
        case 'gpx':
            myFile.content = myFile.trackFile.toGPXDocument().toFile(g_enableBeautify);
            break;
        default:
            reject(new Error('Unsupport dest format: ' + destFormat));
            return;
    }
    resolve(myFile);
});

// ---- promise 2 ----
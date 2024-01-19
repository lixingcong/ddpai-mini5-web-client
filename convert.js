"use strict"

import * as DF from './date-format.js'
import * as TRACK from './track.js'
import * as KML from './kml.js';
import * as GPX from './gpx.js';

var g_errorCount = 0;
var g_fileCount = 0;
var g_Files = []; // MyFile对象
var g_enableBeautify = false; // 是否启用美化

class MyFile
{
    constructor(srcName)
    {
        this.srcName = srcName;
        this.destName = undefined;
        this.srcContent = undefined;
        this.destConetnt = undefined;
        this.trackFile = undefined;
    }
}

const appendSrcFile = (myFile) => {
    g_Files.push(myFile);
    setProgress((g_Files.length) / g_fileCount);
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
    g_Files=[];
    setProgress(0);

    const exportedTrackList = $('#exportedTrackList');
    $('#exportedTrackList').empty();

    const infoList=$('#infoList')
    infoList.empty();

    g_enableBeautify = $('#enable-export-beautify').prop('checked');

    const DestFileFormat = $('select#select-convert-format').find(":selected").val();
    let promises = [];
    for(let i=0;i<fileCount;++i){
        const f = srcFiles[i];

        promises.push(promiseReadBlob(f).then((myFile) => {
            return promiseConvertFormat(myFile, DestFileFormat).then((myFile) => {
                appendSrcFile(myFile);
            })
        }));
    }

    Promise.allSettled(promises).then(function (results) {
		results.forEach(r => {
			if (r.status === 'rejected') {
				appendError(r.reason);
			}
		});

        const description = '转换'+DestFileFormat+'_'+DF.timestampToString(costTimestampBegin / 1000, 'yyyyMMdd-hhmmss');
        const zip = new JSZip();
        const folder = zip.folder(description);
        let counter = 0;
        g_Files.forEach((myFile) => {
            if(myFile && undefined != myFile.destConetnt){
                folder.file(myFile.destName, myFile.destConetnt);
                ++counter;
            }
        });

        if(counter>0){
            var zipBlob = zip.generate({
                compression: "DEFLATE",
                compressionOptions : {level:6},
                type: "blob",
                platform: "DOS",
                mimeType: 'application/zip'
            });

            let filename = description+'.zip';
            let newLink = $('<a>', {
                text: filename,
                download: filename,
                href: URL.createObjectURL(zipBlob)
            });
            exportedTrackList.append(newLink);
        } else {
            exportedTrackList.append($('<a>', {
                text: 'Zip文件内容为空白',
                href: 'javascript:void(0);'
            }));
            exportedTrackList.append('<br/>');
        }

		setProgress(1);

        infoList.append((DF.now() - costTimestampBegin) + 'ms');
	});
});

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

loadArchiveFormats(['zip'], function () {
	let button = $('#convert');
	button.html("执行转换");
	button.prop('disabled', false);
});

// ---- promise 1 ----
const promiseReadBlob = (blob) => new Promise(function (resolve, reject) {
    // API: resolve(MyFile)
    const reader = new FileReader();
    reader.onload = () => {
        let f = new MyFile(blob.name);
        f.srcContent = reader.result;
        resolve(f);
    };
    reader.onerror = reject;
    reader.onabort = reject;
    reader.readAsText(blob);
});

const promiseConvertFormat = (myFile, destFormat) => new Promise(function(resolve, reject) {
    // API: resolve(MyFile)
    const srcNameSplited = myFile.srcName.split('.');
    if(srcNameSplited.length<2){
        reject(new Error('Cannot find filename-ext: ' + myFile.srcName));
        return;
    }

    const srcExtName = srcNameSplited[srcNameSplited.length-1].toLowerCase(); // 取出扩展名

    if(srcExtName == destFormat){
        myFile.destName=myFile.srcName
        myFile.destConetnt =myFile.srcContent;
        resolve(myFile);
        return; // No need for convert
    }else{
        const srcRawNameLength = myFile.srcName.length - srcExtName.length;
        const srcRawName = myFile.srcName.substring(0, srcRawNameLength);
        myFile.destName=srcRawName+destFormat;
    }

    switch(srcExtName){
        case 'kml':
            const kmlDoc = KML.Document.fromFile(myFile.srcContent);
            if(kmlDoc)
                myFile.trackFile=TRACK.TrackFile.fromKMLDocument(kmlDoc);
            break;
        case 'gpx':
            const gpxDoc = GPX.Document.fromFile(myFile.srcContent);
            if(gpxDoc)
                myFile.trackFile=TRACK.TrackFile.fromGPXDocument(gpxDoc);
            break;
        default:
            reject(new Error('Unsupport file: ' + myFile.srcName));
            return;
    }

    if(undefined==myFile.trackFile){
        reject(new Error('Construct track file failed: ' + myFile.srcName));
        return;
    }

    switch(destFormat){
        case 'kml':
            myFile.destConetnt = myFile.trackFile.toKMLDocument().toFile(g_enableBeautify);
            break;
        case 'gpx':
            myFile.destConetnt = myFile.trackFile.toGPXDocument().toFile(g_enableBeautify);
            break;
        default:
            reject(new Error('Unsupport dest format: ' + destFormat));
            return;
    }
    resolve(myFile);
});

// ---- promise 2 ----
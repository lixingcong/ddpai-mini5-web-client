// Use Nodejs to debug locally, not use for deploy to HTTP server
// Shell Command: cat ddpai.js test.js | nodejs

/*
const testTimeSpan = [[1, 2], [3, 5], [6, 10], [0, 1], [0, 3]];
console.log(mergeIntervals(testTimeSpan));
*/

/*
const testInputJson = '\
{"errcode":0,"data":"{\\"num\\":17,\\"file\\":[{\\"index\\":\\"0\\",\\"type\\":\\"49\\",\\"starttime\\":\\"1613931135\\",\
\\"endtime\\":\\"1613931512\\",\\"name\\":\\"20210221181215_0377.git\\",\\"parentfile\\":\\"\\"},{\\"index\\":\\"1\\",\
\\"type\\":\\"49\\",\\"starttime\\":\\"1613930655\\",\\"endtime\\":\\"1613931135\\",\\"name\\":\\"20210221180415_0480.git\\",\
\\"parentfile\\":\\"\\"},{\\"index\\":\\"2\\",\\"type\\":\\"49\\",\\"starttime\\":\\"1613930175\\",\\"endtime\\":\\"1613930655\\",\
\\"name\\":\\"20210221175615_0480.git\\",\\"parentfile\\":\\"\\"},{\\"index\\":\\"3\\",\\"type\\":\\"49\\",\\"starttime\\":\
\\"1613929695\\",\\"endtime\\":\\"1613930175\\",\\"name\\":\\"20210221174815_0480.git\\",\\"parentfile\\":\\"\\"},{\\"index\\":\
\\"4\\",\\"type\\":\\"49\\",\\"starttime\\":\\"1613929215\\",\\"endtime\\":\\"1613929695\\",\\"name\\":\\"20210221174015_0480.git\\",\
\\"parentfile\\":\\"\\"},{\\"index\\":\\"5\\",\\"type\\":\\"49\\",\\"starttime\\":\\"1613928735\\",\\"endtime\\":\\"1613929215\\",\
\\"name\\":\\"20210221173215_0480.git\\",\\"parentfile\\":\\"\\"},{\\"index\\":\\"6\\",\\"type\\":\\"49\\",\\"starttime\\":\
\\"1613928255\\",\\"endtime\\":\\"1613928735\\",\\"name\\":\\"20210221172415_0480.git\\",\\"parentfile\\":\\"\\"},{\
\\"index\\":\\"7\\",\\"type\\":\\"49\\",\\"starttime\\":\\"1613927775\\",\\"endtime\\":\\"1613928255\\",\\"name\\":\
\\"20210221171615_0480.git\\",\\"parentfile\\":\\"\\"},{\\"index\\":\\"8\\",\\"type\\":\\"49\\",\\"starttime\\":\\"1613927295\\",\
\\"endtime\\":\\"1613927775\\",\\"name\\":\\"20210221170815_0480.git\\",\\"parentfile\\":\\"\\"},{\\"index\\":\\"9\\",\
\\"type\\":\\"49\\",\\"starttime\\":\\"1613926815\\",\\"endtime\\":\\"1613927295\\",\\"name\\":\\"20210221170015_0480.git\\",\
\\"parentfile\\":\\"\\"},{\\"index\\":\\"10\\",\\"type\\":\\"49\\",\\"starttime\\":\\"1613926388\\",\\"endtime\\":\\"1613926815\\",\
\\"name\\":\\"20210221165308_0427.git\\",\\"parentfile\\":\\"\\"},{\\"index\\":\\"11\\",\\"type\\":\\"48\\",\\"starttime\\":\
\\"1613931812\\",\\"endtime\\":\\"1613931872\\",\\"name\\":\\"20210221182332_0060.gpx\\",\\"parentfile\\":\\"\\"},{\\"index\\":\
\\"12\\",\\"type\\":\\"48\\",\\"starttime\\":\\"1613931752\\",\\"endtime\\":\\"1613931812\\",\\"name\\":\\"20210221182232_0060.gpx\
\\",\\"parentfile\\":\\"\\"},{\\"index\\":\\"13\\",\\"type\\":\\"48\\",\\"starttime\\":\\"1613931692\\",\\"endtime\\":\\"1613931752\\",\
\\"name\\":\\"20210221182132_0060.gpx\\",\\"parentfile\\":\\"\\"},{\\"index\\":\\"14\\",\\"type\\":\\"48\\",\\"starttime\\":\
\\"1613931632\\",\\"endtime\\":\\"1613931692\\",\\"name\\":\\"20210221182032_0060.gpx\\",\\"parentfile\\":\\"\\"},{\\"index\\":\
\\"15\\",\\"type\\":\\"48\\",\\"starttime\\":\\"1613931572\\",\\"endtime\\":\\"1613931632\\",\\"name\\":\\"20210221181932_0060.gpx\\",\
\\"parentfile\\":\\"\\"},{\\"index\\":\\"16\\",\\"type\\":\\"48\\",\\"starttime\\":\\"1613931512\\",\\"endtime\\":\\"1613931572\\",\
\\"name\\":\\"20210221181832_0060.gpx\\",\\"parentfile\\":\\"\\"}]}"}';
console.log(API_GpsFileListReqToArray(testInputJson));
*/

/*
const testDDDmm=['12345.6789', '2345.6789', '345.6789', '045.6789', '12345.0'];
testDDDmm.forEach(dddmm => {console.log(dddmmToDecimal(dddmm))});
*/

const testGpxFileContent1 = '\
$GPSCAMTIME 20210215124812\n\
$GPGGA,044815.000,0021.333,N,12345.26029,E,1,24,0.60,0.9,M,-4.8,M,,*6A\n\
$GPRMC,044816.000,A,0121.333,N,12345.26001,E,5.426,190.52,150221,,,A*4B\n\
$GPGGA,044816.000,0121.333,N,12345.26029,E,1,24,0.60,0.9,M,-4.8,M,,*6A\n\
$GPRMC,044817.000,A,0221.333,N,12345.26001,E,5.426,190.52,150221,,,A*4B\n\
$GPRMC,,V,,,,,,,,,,N*4D\n\
$GPGGA,,,,,,0,00,,,M,,M,,*78\n\
$GPRMC,044820.000,A,0321.23412,N,12345.26121,E,8.857,191.97,150221,,,A*42\n\
$GPRMC,044828.000,A,4021.23412,N,12345.26121,E,8.857,191.97,150221,,,A*42\n\
$GPGGA,044828.000,4021.23412,N,12345.26121,E,1,24,0.60,1.0,M,-4.8,M,,*60\n\
$GPRMC,044829.000,A,4121.23185,N,12345.26071,E,7.602,191.39,150221,,,A*49\n\
$GPGGA,044829.000,4121.23185,N,12345.26071,E,1,24,0.60,0.9,M,-4.8,M,,*66\n\
$GPRMC,044830.000,A,4221.22985,N,12345.26029,E,6.816,188.82,150221,,,A*47\n\
$GPRMC,044830.279,V,,,,,,,240221,,,N*5F\n\
$GPGGA,044831.279,,,,,0,00,,,M,,M,,*6D\n\
$GPRMC,044831.279,V,,,,,,,240221,,,N*5E\n\
$GPGGA,044832.279,,,,,0,00,,,M,,M,,*6C\n\
$GPGGA,044832.000,4221.22985,N,12345.26029,E,1,24,0.60,0.9,M,-4.8,M,,*6A\n\
$GPRMC,044833.000,A,8800.000,N,9900.00,E,5.426,190.52,150221,,,A*4B\n\
$ABILITY,D,1613364448000,1613364504000,60,0,238\n\
$GSENSORSTARTTIME 20210215124811\n\
$GSENSORDATAFREQUENCY 50 v2.0\n\
$GYRO,-0.569954,0.202751,0.271148\n\
$GSENSOR,0.003565,0.006836,-1.582607\n\
$GYRO,-0.550880,0.263787,0.778503';

const testGpxFileContent2 = '\
$GPSCAMTIME 20210215124813\n\
$GPGGA,044833.000,8800.000,N,9900.00,E,1,24,0.60,0.9,M,-4.8,M,,*6A\n\
$GPRMC,044834.000,A,0121.333,N,12345.26001,E,5.426,190.52,150221,,,A*4B\n\
$GPGGA,044834.000,0121.333,N,12345.26029,E,2,24,0.60,999,M,-4.8,M,,*6A\n\
$GPGGA,044834.000,0121.333,N,12345.26029,E,1,24,0.60,0.9,M,-4.8,M,,*6A\n\
$GPRMC,,V,,,,,,,,,,N*4D\n\
$GPRMC,044835.000,A,0221.333,N,12345.26001,E,5.426,190.52,150221,,,A*4B\n\
$GSENSOR,0.003565,0.006836,-1.582607\n\
$GYRO,-0.550880,0.263787,0.778503';

let preprocessedGpxContent = {};
const preprocessedGpxContent1=preprocessRawGpxFile(testGpxFileContent1, 150, '\n');
const preprocessedGpxContent2=preprocessRawGpxFile(testGpxFileContent2, 150, '\n');
preprocessedGpxContent[preprocessedGpxContent1['startTime']]=preprocessedGpxContent1['content'];
preprocessedGpxContent[preprocessedGpxContent2['startTime']]=preprocessedGpxContent2['content'];
let preprocessedTimestamps=Object.keys(preprocessedGpxContent);
preprocessedTimestamps.sort();
let fullGpxContent=[];
preprocessedTimestamps.forEach( ts => {
	fullGpxContent = fullGpxContent.concat(preprocessedGpxContent[ts]);
});
// console.log(fullGpxContent);
console.log(gpxToPathDict(fullGpxContent));


/*
const fs = require('fs');
fs.readFile('/tmp/1.gpx', 'utf8', (err, data) => {
	if (err) {
		console.error(err);
		return;
	}
	const p = preprocessRawGpxFile(data, 150, '\n');
	//console.log(p);
	const finalResult = gpxToPathDict(p['content']);
	console.log(finalResult);
});
*/
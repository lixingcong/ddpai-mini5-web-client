/**
 * 从json中提取出data字段
 *
 * @param {string} inputJson 输入值，即API_GpsFileListReq的结果
 * @return {array} 当errcode字段为0时，返回数组，每个元素是字典，键值对详见代码，否则返回Array()
 */
function API_GpsFileListReqToArray(inputJson) {
    var j = JSON.parse(inputJson);
    var ret = new Array();
    if (0 == j.errcode) {
        file = JSON.parse(j.data).file;
        var lastStartTime = 0;
        var startTime, endTime;
        var f;
        var lastArrayItem = undefined;
        for (var i = 0; i < file.length; i++) {
            f = file[i];
            //console.log(f);
            startTime = parseInt(f.starttime);
            endTime = parseInt(f.endtime);

            if (endTime !== lastStartTime) {
                lastArrayItem = {
                    'from': startTime,
                    'to': endTime,
                    'gpx': 0,
                    'git': 0,
                    'filename': new Array()
                };
                ret.push(lastArrayItem);
            } else {
                lastArrayItem['from'] = startTime;
            }

            filename = f.name;
            if (filename.endsWith('git'))
                lastArrayItem['git']++;
            else if (filename.endsWith('gpx'))
                lastArrayItem['gpx']++;

            lastArrayItem['filename'].push(filename);
            lastStartTime = startTime;
        }
    }

    ret.forEach(function (i) { i['filename'].reverse(); });
    return ret;
}

/**
 * 将GPS数据中的dddmm.mmmmm转化为十进制的度数
 *
 * @param {string} dddmm 非负数 dddmm.mmmmmm格式的字符串，其中mm.mmmmmm的单位是分
 * @return {number} 转化后的十进制度数
 */
function dddmmToDecimal(dddmm) {
    var s = dddmm.split('.');
    var s0 = s[0], s1 = s[1];
    var s0Len = s0.length;
    var dString = s0.substr(0, s0Len - 2);
    var mString = s0.substr(s0Len - 2) + '.' + s1;
    var d = parseFloat(dString);
    var m = parseFloat(mString) / 60;
    return d + m;
}

/**
 * 从ddpai中的gpx文件中提取GPS相关字段并转成数组
 * 经纬度用南纬S是负，北纬N是正，东经E是正，西经W是负
 *
 * @param {string} gpxFileContent gpx文件内容，即ASCII字符串
 * @param {number} maxLineCount 为了提高效率，指定读取的最大行数
 * @param {string} newline gpx回车换行符，应该是"\n"
 * @return {array} 字典，key为timestamp，value为timestamp时刻的位置信息，类型是字典，具体字段见代码
 */
function gpxToPathDict(gpxFileContent, maxLineCount, newline) {
    var ret = {};
    gpxes = gpxFileContent.split(newline);
    var actualLineCount = Math.min(maxLineCount, gpxes.length);
    var line;
    var comma = ',';
    var lastTimeString = '';
    var timestamp = 0;
    var dateObj = new Date();
    for (var i = 0; i < actualLineCount; i++) {
        line = gpxes[i];
        // console.log(line);
        if (line.startsWith('$GPRMC')) {
            columns = line.split(comma);

            // column
            timeString = columns[1].substr(0, 6);
            lat = columns[3];
            latSgn = columns[4] === 'N' ? 1 : -1;
            lon = columns[5];
            lonSgn = columns[6] === 'E' ? 1 : -1;
            // knots = parseFloat(columns[7]);
            // heading = parseFloat(columns[8]);
            dateString = columns[9];

            // datetime
            year = 2000 + parseInt(dateString.substr(4, 2));
            month = parseInt(dateString.substr(2, 2));
            day = parseInt(dateString.substr(0, 2));
            hour = parseInt(timeString.substr(0, 2));
            minute = parseInt(timeString.substr(2, 2));
            second = parseInt(timeString.substr(4, 2));
            //console.log(year+' '+month+' '+day+' '+hour+' '+minute+' '+second);
            dateObj.setUTCFullYear(year, month, day);
            dateObj.setUTCHours(hour, minute, second, 0);
            timestamp = dateObj.getTime() / 1000;

            var gps = {
                'lat': dddmmToDecimal(lat) * latSgn,
                'lon': dddmmToDecimal(lon) * lonSgn,
                // 'speed': 1.852 * knots, // 速度单位：km/h
                // 'heading': heading, // 航向单位：度
            };
            //console.log(gps);
            ret[timestamp] = gps;
            lastTimeString = timeString;
        } else if (line.startsWith('$GPGGA')) {
            columns = line.split(comma);
            timeString = columns[1].substr(0, 6);

            if (timeString === lastTimeString) { // 一般情况是，GPGGA那一行，出现在GPRMC后
                // hdop = parseFloat(columns[8]);
                altitude = parseFloat(columns[9]);

                var gps = ret[timestamp]; // 取引用
                // gps['hdop'] = hdop; // 水平精度单位：米
                gps['altitude'] = altitude; // 海拔高度单位：米
            }
        }
    }

    return ret;
}

function kmlHead(docName) {
    return '\
<?xml version="1.0" encoding="UTF-8"?>\n\
<kml xmlns="http://earth.google.com/kml/2.2">\n\
<Document><name>'+ docName + '</name>\n\
<Placemark><name>path</name>\n\
<LineString><altitudeMode>absolute</altitudeMode><coordinates>\n';
}

function kmlCoord(lat, lon, alt, precision) {
    return lon.toFixed(precision) + ',' + lat.toFixed(precision) + ',' + alt.toFixed(1);
}

function kmlTail() {
    return '\n</coordinates></LineString></Placemark></Document></kml>';
}

/* for test only 1 */
// var testInputJson = '{"errcode":0,"data":"{\\"num\\":17,\\"file\\":[{\\"index\\":\\"0\\",\\"type\\":\\"49\\",\\"starttime\\":\\"1613931135\\",\\"endtime\\":\\"1613931512\\",\\"name\\":\\"20210221181215_0377.git\\",\\"parentfile\\":\\"\\"},{\\"index\\":\\"1\\",\\"type\\":\\"49\\",\\"starttime\\":\\"1613930655\\",\\"endtime\\":\\"1613931135\\",\\"name\\":\\"20210221180415_0480.git\\",\\"parentfile\\":\\"\\"},{\\"index\\":\\"2\\",\\"type\\":\\"49\\",\\"starttime\\":\\"1613930175\\",\\"endtime\\":\\"1613930655\\",\\"name\\":\\"20210221175615_0480.git\\",\\"parentfile\\":\\"\\"},{\\"index\\":\\"3\\",\\"type\\":\\"49\\",\\"starttime\\":\\"1613929695\\",\\"endtime\\":\\"1613930175\\",\\"name\\":\\"20210221174815_0480.git\\",\\"parentfile\\":\\"\\"},{\\"index\\":\\"4\\",\\"type\\":\\"49\\",\\"starttime\\":\\"1613929215\\",\\"endtime\\":\\"1613929695\\",\\"name\\":\\"20210221174015_0480.git\\",\\"parentfile\\":\\"\\"},{\\"index\\":\\"5\\",\\"type\\":\\"49\\",\\"starttime\\":\\"1613928735\\",\\"endtime\\":\\"1613929215\\",\\"name\\":\\"20210221173215_0480.git\\",\\"parentfile\\":\\"\\"},{\\"index\\":\\"6\\",\\"type\\":\\"49\\",\\"starttime\\":\\"1613928255\\",\\"endtime\\":\\"1613928735\\",\\"name\\":\\"20210221172415_0480.git\\",\\"parentfile\\":\\"\\"},{\\"index\\":\\"7\\",\\"type\\":\\"49\\",\\"starttime\\":\\"1613927775\\",\\"endtime\\":\\"1613928255\\",\\"name\\":\\"20210221171615_0480.git\\",\\"parentfile\\":\\"\\"},{\\"index\\":\\"8\\",\\"type\\":\\"49\\",\\"starttime\\":\\"1613927295\\",\\"endtime\\":\\"1613927775\\",\\"name\\":\\"20210221170815_0480.git\\",\\"parentfile\\":\\"\\"},{\\"index\\":\\"9\\",\\"type\\":\\"49\\",\\"starttime\\":\\"1613926815\\",\\"endtime\\":\\"1613927295\\",\\"name\\":\\"20210221170015_0480.git\\",\\"parentfile\\":\\"\\"},{\\"index\\":\\"10\\",\\"type\\":\\"49\\",\\"starttime\\":\\"1613926388\\",\\"endtime\\":\\"1613926815\\",\\"name\\":\\"20210221165308_0427.git\\",\\"parentfile\\":\\"\\"},{\\"index\\":\\"11\\",\\"type\\":\\"48\\",\\"starttime\\":\\"1613931812\\",\\"endtime\\":\\"1613931872\\",\\"name\\":\\"20210221182332_0060.gpx\\",\\"parentfile\\":\\"\\"},{\\"index\\":\\"12\\",\\"type\\":\\"48\\",\\"starttime\\":\\"1613931752\\",\\"endtime\\":\\"1613931812\\",\\"name\\":\\"20210221182232_0060.gpx\\",\\"parentfile\\":\\"\\"},{\\"index\\":\\"13\\",\\"type\\":\\"48\\",\\"starttime\\":\\"1613931692\\",\\"endtime\\":\\"1613931752\\",\\"name\\":\\"20210221182132_0060.gpx\\",\\"parentfile\\":\\"\\"},{\\"index\\":\\"14\\",\\"type\\":\\"48\\",\\"starttime\\":\\"1613931632\\",\\"endtime\\":\\"1613931692\\",\\"name\\":\\"20210221182032_0060.gpx\\",\\"parentfile\\":\\"\\"},{\\"index\\":\\"15\\",\\"type\\":\\"48\\",\\"starttime\\":\\"1613931572\\",\\"endtime\\":\\"1613931632\\",\\"name\\":\\"20210221181932_0060.gpx\\",\\"parentfile\\":\\"\\"},{\\"index\\":\\"16\\",\\"type\\":\\"48\\",\\"starttime\\":\\"1613931512\\",\\"endtime\\":\\"1613931572\\",\\"name\\":\\"20210221181832_0060.gpx\\",\\"parentfile\\":\\"\\"}]}"}';
// console.log(API_GpsFileListReqToArray(testInputJson));

// var testTimeArray = [[1, 3], [3, 10], [10, 12]];
// console.log(findTimespan(3, 11, testTimeArray));

/* test gpx file
var testGpxFileContent = '\
$GPSCAMTIME 20210215124812\n\
$GPRMC,044828.000,A,4021.23412,N,12345.26121,E,8.857,191.97,150221,,,A*42\n\
$GPGGA,044828.000,4021.23412,N,12345.26121,E,1,24,0.60,1.0,M,-4.8,M,,*60\n\
$GPRMC,044829.000,A,4121.23185,N,12345.26071,E,7.602,191.39,150221,,,A*49\n\
$GPGGA,044829.000,4121.23185,N,12345.26071,E,1,24,0.60,0.9,M,-4.8,M,,*66\n\
$GPRMC,044830.000,A,4221.22985,N,12345.26029,E,6.816,188.82,150221,,,A*47\n\
$GPGGA,044830.000,4221.22985,N,12345.26029,E,1,24,0.60,0.9,M,-4.8,M,,*6A\n\
$GPRMC,044831.000,A,4321.22812,N,12345.26001,E,5.426,190.52,150221,,,A*4B\n\
$ABILITY,D,1613364448000,1613364504000,60,0,238\n\
$GSENSORSTARTTIME 20210215124811\n\
$GSENSORDATAFREQUENCY 50 v2.0\n\
$GYRO,-0.569954,0.202751,0.271148\n\
$GSENSOR,0.003565,0.006836,-1.582607\n\
$GYRO,-0.550880,0.263787,0.778503';
console.log(gpxToPathDict(testGpxFileContent, 6, '\n'));
test gpx file */

// console.log(kmlHead('xx33'));
// console.log(kmlCoord(1.23456789, 2.23456789, 4.5, 4));
// console.log(kmlTail());
/* for test only 2 */
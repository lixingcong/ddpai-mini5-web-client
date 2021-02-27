"use strict"

/**
 * 从json中提取出data字段
 *
 * @param {string} inputJson 输入值，即API_GpsFileListReq的结果
 * @return {array} 当errcode字段为0时，返回数组，每个元素是字典，键值对详见代码，否则返回Array()
 */
function API_GpsFileListReqToArray(inputJson) {
    let j = JSON.parse(inputJson);
    let ret = new Array();
    if (0 == j.errcode) {
        let file = JSON.parse(j.data).file;
        let lastStartTime = 0;
        let startTime, endTime;
        let f, filename;
        let lastArrayItem = undefined;
        for (let i = 0; i < file.length; i++) {
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
    let s = dddmm.split('.');
    let s0 = s[0], s1 = s[1];
    let s0Len = s0.length;
    let dString = s0.substr(0, s0Len - 2);
    let mString = s0.substr(s0Len - 2) + '.' + s1;
    let d = parseFloat(dString);
    let m = parseFloat(mString) / 60;
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
    let ret = {};
    let gpxes = gpxFileContent.split(newline);
    let actualLineCount = Math.min(maxLineCount, gpxes.length);
    let line;
    let comma = ',';
    let lastTimeString = '', timeString, dateString;
    let timestamp = 0;
    let dateObj = new Date();
    let lat, lon, latSgn, lonSgn, year, month, day, hour, minute, second, columns, altitude;
    // let hdop, knots, heading;
    for (let i = 0; i < actualLineCount; i++) {
        line = gpxes[i];
        // console.log(line);
        if (line.startsWith('$GPRMC')) {
            columns = line.split(comma);
            if (columns.length < 13) {
                // console.log('invalid GPRMC record');
                continue;
            }

            timeString = columns[1];
            dateString = columns[9];
            lat = columns[3];
            lon = columns[5];
            if (timeString.length === 0 || dateString.length === 0 || lat.length === 0 || lon.length === 0) {
                timestamp = 0; // invalid
                // console.log('invalid GPRMC record');
                continue;
            }

            // column
            timeString = timeString.substr(0, 6);
            latSgn = columns[4] === 'N' ? 1 : -1;
            lonSgn = columns[6] === 'E' ? 1 : -1;
            // knots = parseFloat(columns[7]);
            // heading = parseFloat(columns[8]);

            // datetime
            year = 2000 + parseInt(dateString.substr(4, 2));
            month = parseInt(dateString.substr(2, 2));
            day = parseInt(dateString.substr(0, 2));
            hour = parseInt(timeString.substr(0, 2));
            minute = parseInt(timeString.substr(2, 2));
            second = parseInt(timeString.substr(4, 2));
            //console.log(year+' '+month+' '+day+' '+hour+' '+minute+' '+second);
            dateObj.setUTCFullYear(year, month - 1, day);
            dateObj.setUTCHours(hour, minute, second, 0);
            timestamp = Math.trunc(dateObj.getTime() / 1000);

            let gps = {
                'lat': dddmmToDecimal(lat) * latSgn,
                'lon': dddmmToDecimal(lon) * lonSgn,
                // 'speed': 1.852 * knots, // 速度单位：km/h
                // 'heading': heading, // 航向单位：度
            };
            // console.log(gps);
            ret[timestamp] = gps;
            lastTimeString = timeString;
        } else if (line.startsWith('$GPGGA')) {
            columns = line.split(comma);
            if (columns.length < 15) {
                // console.log('invalid GPGGA record');
                continue;
            }

            timeString = columns[1];
            if (timeString.length === 0) {
                timestamp = 0;
                // console.log('invalid GPGGA record');
                continue;
            }

            // hdop = columns[8];
            altitude = columns[9];
            if (altitude.length === 0 /*|| hdop.length===0*/)
                continue;

            timeString = timeString.substr(0, 6);

            if (timeString === lastTimeString && timestamp != 0) { // 一般情况是，GPGGA那一行，出现在GPRMC后
                // hdop=parseFloat(hdop);
                altitude = parseFloat(altitude);

                let gps = ret[timestamp]; // 取引用
                // gps['hdop'] = hdop; // 水平精度单位：米
                gps['altitude'] = altitude; // 海拔高度单位：米
                // console.log('hdop='+hdop+', alt='+altitude);
            }
        }
    }

    return ret;
}

/* for test only 1 */
// let testInputJson = '{"errcode":0,"data":"{\\"num\\":17,\\"file\\":[{\\"index\\":\\"0\\",\\"type\\":\\"49\\",\\"starttime\\":\\"1613931135\\",\\"endtime\\":\\"1613931512\\",\\"name\\":\\"20210221181215_0377.git\\",\\"parentfile\\":\\"\\"},{\\"index\\":\\"1\\",\\"type\\":\\"49\\",\\"starttime\\":\\"1613930655\\",\\"endtime\\":\\"1613931135\\",\\"name\\":\\"20210221180415_0480.git\\",\\"parentfile\\":\\"\\"},{\\"index\\":\\"2\\",\\"type\\":\\"49\\",\\"starttime\\":\\"1613930175\\",\\"endtime\\":\\"1613930655\\",\\"name\\":\\"20210221175615_0480.git\\",\\"parentfile\\":\\"\\"},{\\"index\\":\\"3\\",\\"type\\":\\"49\\",\\"starttime\\":\\"1613929695\\",\\"endtime\\":\\"1613930175\\",\\"name\\":\\"20210221174815_0480.git\\",\\"parentfile\\":\\"\\"},{\\"index\\":\\"4\\",\\"type\\":\\"49\\",\\"starttime\\":\\"1613929215\\",\\"endtime\\":\\"1613929695\\",\\"name\\":\\"20210221174015_0480.git\\",\\"parentfile\\":\\"\\"},{\\"index\\":\\"5\\",\\"type\\":\\"49\\",\\"starttime\\":\\"1613928735\\",\\"endtime\\":\\"1613929215\\",\\"name\\":\\"20210221173215_0480.git\\",\\"parentfile\\":\\"\\"},{\\"index\\":\\"6\\",\\"type\\":\\"49\\",\\"starttime\\":\\"1613928255\\",\\"endtime\\":\\"1613928735\\",\\"name\\":\\"20210221172415_0480.git\\",\\"parentfile\\":\\"\\"},{\\"index\\":\\"7\\",\\"type\\":\\"49\\",\\"starttime\\":\\"1613927775\\",\\"endtime\\":\\"1613928255\\",\\"name\\":\\"20210221171615_0480.git\\",\\"parentfile\\":\\"\\"},{\\"index\\":\\"8\\",\\"type\\":\\"49\\",\\"starttime\\":\\"1613927295\\",\\"endtime\\":\\"1613927775\\",\\"name\\":\\"20210221170815_0480.git\\",\\"parentfile\\":\\"\\"},{\\"index\\":\\"9\\",\\"type\\":\\"49\\",\\"starttime\\":\\"1613926815\\",\\"endtime\\":\\"1613927295\\",\\"name\\":\\"20210221170015_0480.git\\",\\"parentfile\\":\\"\\"},{\\"index\\":\\"10\\",\\"type\\":\\"49\\",\\"starttime\\":\\"1613926388\\",\\"endtime\\":\\"1613926815\\",\\"name\\":\\"20210221165308_0427.git\\",\\"parentfile\\":\\"\\"},{\\"index\\":\\"11\\",\\"type\\":\\"48\\",\\"starttime\\":\\"1613931812\\",\\"endtime\\":\\"1613931872\\",\\"name\\":\\"20210221182332_0060.gpx\\",\\"parentfile\\":\\"\\"},{\\"index\\":\\"12\\",\\"type\\":\\"48\\",\\"starttime\\":\\"1613931752\\",\\"endtime\\":\\"1613931812\\",\\"name\\":\\"20210221182232_0060.gpx\\",\\"parentfile\\":\\"\\"},{\\"index\\":\\"13\\",\\"type\\":\\"48\\",\\"starttime\\":\\"1613931692\\",\\"endtime\\":\\"1613931752\\",\\"name\\":\\"20210221182132_0060.gpx\\",\\"parentfile\\":\\"\\"},{\\"index\\":\\"14\\",\\"type\\":\\"48\\",\\"starttime\\":\\"1613931632\\",\\"endtime\\":\\"1613931692\\",\\"name\\":\\"20210221182032_0060.gpx\\",\\"parentfile\\":\\"\\"},{\\"index\\":\\"15\\",\\"type\\":\\"48\\",\\"starttime\\":\\"1613931572\\",\\"endtime\\":\\"1613931632\\",\\"name\\":\\"20210221181932_0060.gpx\\",\\"parentfile\\":\\"\\"},{\\"index\\":\\"16\\",\\"type\\":\\"48\\",\\"starttime\\":\\"1613931512\\",\\"endtime\\":\\"1613931572\\",\\"name\\":\\"20210221181832_0060.gpx\\",\\"parentfile\\":\\"\\"}]}"}';
// console.log(API_GpsFileListReqToArray(testInputJson));

// let testDDDmm=['12345.6789', '2345.6789', '345.6789', '045.6789', '12345.0'];
// testDDDmm.forEach(dddmm => {console.log(dddmmToDecimal(dddmm))});

/* test gpx file
let testGpxFileContent = '\
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
$GPRMC,044833.000,A,4321.22812,N,12345.26001,E,5.426,190.52,150221,,,A*4B\n\
$ABILITY,D,1613364448000,1613364504000,60,0,238\n\
$GSENSORSTARTTIME 20210215124811\n\
$GSENSORDATAFREQUENCY 50 v2.0\n\
$GYRO,-0.569954,0.202751,0.271148\n\
$GSENSOR,0.003565,0.006836,-1.582607\n\
$GYRO,-0.550880,0.263787,0.778503';
console.log(gpxToPathDict(testGpxFileContent, 100, '\n'));
test gpx file */
/* for test only 2 */
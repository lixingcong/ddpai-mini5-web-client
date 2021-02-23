/**
 * 从json中提取出data字段
 *
 * @param {string} inputJson 输入值，即API_GpsFileListReq的结果
 * @return {*} 当errcode字段为0时，返回data字段下的内容，否则返回null
 */
function gpsFileListToArray(inputJson) {
    var j = JSON.parse(inputJson);
    if (0 == j.errcode) {
        j = j.data;
        return j;
    }
    return null;
}


/**
 * 从数组{[a,b],[b,c],[d,e]}中找出合适的时间跨度
 *
 * @param {number} fromTime 开始值timestamp，在timeArray中，合法的时间跨度的起始值应该 >= 本参数
 * @param {number} toTime 结束值timestamp，在timeArray中，合法的时间跨度的结束值应该 <= 本参数
 * @param {Array} timeArray 数组{[a,b],[b,c],[d,e]}，每个元素[a,b]为[开始时间,结束时间]
 * @return {Array} 一维数组，为timeArray中的下标，若找不到，则返回Array()
 */
function findTimespan(fromTime, toTime, timeArray) {
    var ret = new Array();
    var a0 = 0, a1 = 0;
    timeArray.forEach(function (timestamps, index) {
        a0 = timestamps[0];
        a1 = timestamps[1];
        if (fromTime <= a0 && a1 <= toTime)
            ret.push(index);
    });
    return ret;
}

/* for test only 1 */
// var testInputJson='{"errcode":0,"data":"{\\"num\\":17,\\"file\\":[{\\"index\\":\\"0\\",\\"type\\":\\"49\\",\\"starttime\\":\\"1613931135\\",\\"endtime\\":\\"1613931512\\",\\"name\\":\\"20210221181215_0377.git\\",\\"parentfile\\":\\"\\"},{\\"index\\":\\"1\\",\\"type\\":\\"49\\",\\"starttime\\":\\"1613930655\\",\\"endtime\\":\\"1613931135\\",\\"name\\":\\"20210221180415_0480.git\\",\\"parentfile\\":\\"\\"},{\\"index\\":\\"2\\",\\"type\\":\\"49\\",\\"starttime\\":\\"1613930175\\",\\"endtime\\":\\"1613930655\\",\\"name\\":\\"20210221175615_0480.git\\",\\"parentfile\\":\\"\\"},{\\"index\\":\\"3\\",\\"type\\":\\"49\\",\\"starttime\\":\\"1613929695\\",\\"endtime\\":\\"1613930175\\",\\"name\\":\\"20210221174815_0480.git\\",\\"parentfile\\":\\"\\"},{\\"index\\":\\"4\\",\\"type\\":\\"49\\",\\"starttime\\":\\"1613929215\\",\\"endtime\\":\\"1613929695\\",\\"name\\":\\"20210221174015_0480.git\\",\\"parentfile\\":\\"\\"},{\\"index\\":\\"5\\",\\"type\\":\\"49\\",\\"starttime\\":\\"1613928735\\",\\"endtime\\":\\"1613929215\\",\\"name\\":\\"20210221173215_0480.git\\",\\"parentfile\\":\\"\\"},{\\"index\\":\\"6\\",\\"type\\":\\"49\\",\\"starttime\\":\\"1613928255\\",\\"endtime\\":\\"1613928735\\",\\"name\\":\\"20210221172415_0480.git\\",\\"parentfile\\":\\"\\"},{\\"index\\":\\"7\\",\\"type\\":\\"49\\",\\"starttime\\":\\"1613927775\\",\\"endtime\\":\\"1613928255\\",\\"name\\":\\"20210221171615_0480.git\\",\\"parentfile\\":\\"\\"},{\\"index\\":\\"8\\",\\"type\\":\\"49\\",\\"starttime\\":\\"1613927295\\",\\"endtime\\":\\"1613927775\\",\\"name\\":\\"20210221170815_0480.git\\",\\"parentfile\\":\\"\\"},{\\"index\\":\\"9\\",\\"type\\":\\"49\\",\\"starttime\\":\\"1613926815\\",\\"endtime\\":\\"1613927295\\",\\"name\\":\\"20210221170015_0480.git\\",\\"parentfile\\":\\"\\"},{\\"index\\":\\"10\\",\\"type\\":\\"49\\",\\"starttime\\":\\"1613926388\\",\\"endtime\\":\\"1613926815\\",\\"name\\":\\"20210221165308_0427.git\\",\\"parentfile\\":\\"\\"},{\\"index\\":\\"11\\",\\"type\\":\\"48\\",\\"starttime\\":\\"1613931812\\",\\"endtime\\":\\"1613931872\\",\\"name\\":\\"20210221182332_0060.gpx\\",\\"parentfile\\":\\"\\"},{\\"index\\":\\"12\\",\\"type\\":\\"48\\",\\"starttime\\":\\"1613931752\\",\\"endtime\\":\\"1613931812\\",\\"name\\":\\"20210221182232_0060.gpx\\",\\"parentfile\\":\\"\\"},{\\"index\\":\\"13\\",\\"type\\":\\"48\\",\\"starttime\\":\\"1613931692\\",\\"endtime\\":\\"1613931752\\",\\"name\\":\\"20210221182132_0060.gpx\\",\\"parentfile\\":\\"\\"},{\\"index\\":\\"14\\",\\"type\\":\\"48\\",\\"starttime\\":\\"1613931632\\",\\"endtime\\":\\"1613931692\\",\\"name\\":\\"20210221182032_0060.gpx\\",\\"parentfile\\":\\"\\"},{\\"index\\":\\"15\\",\\"type\\":\\"48\\",\\"starttime\\":\\"1613931572\\",\\"endtime\\":\\"1613931632\\",\\"name\\":\\"20210221181932_0060.gpx\\",\\"parentfile\\":\\"\\"},{\\"index\\":\\"16\\",\\"type\\":\\"48\\",\\"starttime\\":\\"1613931512\\",\\"endtime\\":\\"1613931572\\",\\"name\\":\\"20210221181832_0060.gpx\\",\\"parentfile\\":\\"\\"}]}"}';
// console.log(gpsFileListToArray(testInputJson));

// var testTimeArray = [[1, 3], [3, 10], [10, 12]];
// console.log(findTimespan(3, 11, testTimeArray));
/* for test only 2 */
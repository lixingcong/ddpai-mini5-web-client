"use strict"

import * as DDPAI from '../ddpai.js';
import * as TEST_COMMON from './test-common.js';

{
    const input = [[1, 2], [3, 5], [6, 10], [0, 1], [0, 3]];
    const expectOutput = { 'merged': [[0, 5], [6, 10]], 'index': [0, 0, 1, 0, 0] };
    TEST_COMMON.assert(TEST_COMMON.isObjectEqual(DDPAI.mergeIntervals(input), expectOutput), 'mergeIntervals');
}

{
    //console.log('API_GpsFileListReqToArray:');
    const input = '{"errcode":0,"data":"{\\"num\\":17,\\"file\\":[{\\"index\\":\\"0\\",\\"type\\":\\"49\\",\\"starttime\\":\\"1613931135\\",\\"endtime\\":\\"1613931512\\",\\"name\\":\\"20210221181215_0377.git\\",\\"parentfile\\":\\"\\"},{\\"index\\":\\"1\\",\\"type\\":\\"49\\",\\"starttime\\":\\"1613930655\\",\\"endtime\\":\\"1613931135\\",\\"name\\":\\"20210221180415_0480.git\\",\\"parentfile\\":\\"\\"},{\\"index\\":\\"2\\",\\"type\\":\\"49\\",\\"starttime\\":\\"1613930175\\",\\"endtime\\":\\"1613930655\\",\\"name\\":\\"20210221175615_0480.git\\",\\"parentfile\\":\\"\\"},{\\"index\\":\\"3\\",\\"type\\":\\"49\\",\\"starttime\\":\\"1613929695\\",\\"endtime\\":\\"1613930175\\",\\"name\\":\\"20210221174815_0480.git\\",\\"parentfile\\":\\"\\"},{\\"index\\":\\"4\\",\\"type\\":\\"49\\",\\"starttime\\":\\"1613929215\\",\\"endtime\\":\\"1613929695\\",\\"name\\":\\"20210221174015_0480.git\\",\\"parentfile\\":\\"\\"},{\\"index\\":\\"5\\",\\"type\\":\\"49\\",\\"starttime\\":\\"1613928735\\",\\"endtime\\":\\"1613929215\\",\\"name\\":\\"20210221173215_0480.git\\",\\"parentfile\\":\\"\\"},{\\"index\\":\\"6\\",\\"type\\":\\"49\\",\\"starttime\\":\\"1613928255\\",\\"endtime\\":\\"1613928735\\",\\"name\\":\\"20210221172415_0480.git\\",\\"parentfile\\":\\"\\"},{\\"index\\":\\"7\\",\\"type\\":\\"49\\",\\"starttime\\":\\"1613927775\\",\\"endtime\\":\\"1613928255\\",\\"name\\":\\"20210221171615_0480.git\\",\\"parentfile\\":\\"\\"},{\\"index\\":\\"8\\",\\"type\\":\\"49\\",\\"starttime\\":\\"1613927295\\",\\"endtime\\":\\"1613927775\\",\\"name\\":\\"20210221170815_0480.git\\",\\"parentfile\\":\\"\\"},{\\"index\\":\\"9\\",\\"type\\":\\"49\\",\\"starttime\\":\\"1613926815\\",\\"endtime\\":\\"1613927295\\",\\"name\\":\\"20210221170015_0480.git\\",\\"parentfile\\":\\"\\"},{\\"index\\":\\"10\\",\\"type\\":\\"49\\",\\"starttime\\":\\"1613926388\\",\\"endtime\\":\\"1613926815\\",\\"name\\":\\"20210221165308_0427.git\\",\\"parentfile\\":\\"\\"},{\\"index\\":\\"11\\",\\"type\\":\\"48\\",\\"starttime\\":\\"1613931812\\",\\"endtime\\":\\"1613931872\\",\\"name\\":\\"20210221182332_0060.gpx\\",\\"parentfile\\":\\"\\"},{\\"index\\":\\"12\\",\\"type\\":\\"48\\",\\"starttime\\":\\"1613931752\\",\\"endtime\\":\\"1613931812\\",\\"name\\":\\"20210221182232_0060.gpx\\",\\"parentfile\\":\\"\\"},{\\"index\\":\\"13\\",\\"type\\":\\"48\\",\\"starttime\\":\\"1613931692\\",\\"endtime\\":\\"1613931752\\",\\"name\\":\\"20210221182132_0060.gpx\\",\\"parentfile\\":\\"\\"},{\\"index\\":\\"14\\",\\"type\\":\\"48\\",\\"starttime\\":\\"1613931632\\",\\"endtime\\":\\"1613931692\\",\\"name\\":\\"20210221182032_0060.gpx\\",\\"parentfile\\":\\"\\"},{\\"index\\":\\"15\\",\\"type\\":\\"48\\",\\"starttime\\":\\"1613931572\\",\\"endtime\\":\\"1613931632\\",\\"name\\":\\"20210221181932_0060.gpx\\",\\"parentfile\\":\\"\\"},{\\"index\\":\\"16\\",\\"type\\":\\"48\\",\\"starttime\\":\\"1613931512\\",\\"endtime\\":\\"1613931572\\",\\"name\\":\\"20210221181832_0060.gpx\\",\\"parentfile\\":\\"\\"}]}"}';
    const expectOutput = [{
            from: 1613897588,
            to: 1613903072,
            filename: [
                '20210221165308_0427.git',
                '20210221170015_0480.git',
                '20210221170815_0480.git',
                '20210221171615_0480.git',
                '20210221172415_0480.git',
                '20210221173215_0480.git',
                '20210221174015_0480.git',
                '20210221174815_0480.git',
                '20210221175615_0480.git',
                '20210221180415_0480.git',
                '20210221181215_0377.git',
                '20210221181832_0060.gpx',
                '20210221181932_0060.gpx',
                '20210221182032_0060.gpx',
                '20210221182132_0060.gpx',
                '20210221182232_0060.gpx',
                '20210221182332_0060.gpx'
            ]
    }];
    TEST_COMMON.assert(TEST_COMMON.isObjectEqual(DDPAI.API_GpsFileListReqToArray(input), expectOutput), 'API_GpsFileListReqToArray');
}

{
    const input = ['12345.6789', '2345.6789', '345.6789', '045.6789', '12345.0'];
    const expectOutput = [123.761315, 23.761315, 3.7613149999999997, 0.761315, 123.75]
    input.forEach((dddmm,idx) => { TEST_COMMON.assert(DDPAI.dddmmToDecimal(dddmm) == expectOutput[idx], 'dddmmToDecimal('+dddmm+') failed'); });
}

{
    const testGpxFileContent = '\
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

    const expectPreprocessedOutput = {
        startTime: 1613393292,
        content: [
            '$GPGGA,044815.000,0021.333,N,12345.26029,E,1,24,0.60,0.9,M,-4.8,M,,*6A',
            '$GPRMC,044816.000,A,0121.333,N,12345.26001,E,5.426,190.52,150221,,,A*4B',
            '$GPGGA,044816.000,0121.333,N,12345.26029,E,1,24,0.60,0.9,M,-4.8,M,,*6A',
            '$GPRMC,044817.000,A,0221.333,N,12345.26001,E,5.426,190.52,150221,,,A*4B',
            '$GPRMC,,V,,,,,,,,,,N*4D',
            '$GPGGA,,,,,,0,00,,,M,,M,,*78',
            '$GPRMC,044820.000,A,0321.23412,N,12345.26121,E,8.857,191.97,150221,,,A*42',
            '$GPRMC,044828.000,A,4021.23412,N,12345.26121,E,8.857,191.97,150221,,,A*42',
            '$GPGGA,044828.000,4021.23412,N,12345.26121,E,1,24,0.60,1.0,M,-4.8,M,,*60',
            '$GPRMC,044829.000,A,4121.23185,N,12345.26071,E,7.602,191.39,150221,,,A*49',
            '$GPGGA,044829.000,4121.23185,N,12345.26071,E,1,24,0.60,0.9,M,-4.8,M,,*66',
            '$GPRMC,044830.000,A,4221.22985,N,12345.26029,E,6.816,188.82,150221,,,A*47',
            '$GPRMC,044830.279,V,,,,,,,240221,,,N*5F',
            '$GPGGA,044831.279,,,,,0,00,,,M,,M,,*6D',
            '$GPRMC,044831.279,V,,,,,,,240221,,,N*5E',
            '$GPGGA,044832.279,,,,,0,00,,,M,,M,,*6C',
            '$GPGGA,044832.000,4221.22985,N,12345.26029,E,1,24,0.60,0.9,M,-4.8,M,,*6A',
            '$GPRMC,044833.000,A,4321.22812,N,12345.26001,E,5.426,190.52,150221,,,A*4B'
    ]};

    const preprocessedOutput = DDPAI.preprocessRawGpxFile(testGpxFileContent, 100, '\n');
    TEST_COMMON.assert(TEST_COMMON.isObjectEqual(preprocessedOutput, expectPreprocessedOutput), 'preprocessRawGpxFile');


    const expectWaypointOutput = {
        '1613364496':  {
          lat: 1.35555,
          lon: 123.754334,
          timestamp: 1613364496,
          altitude: 0.9,
          speed: 10.048952000000002,
          heading: 190.52,
          hdop: 0.6
        },
        '1613364497':  {
          lat: 2.35555,
          lon: 123.754334,
          timestamp: 1613364497,
          altitude: undefined,
          speed: 10.048952000000002,
          heading: 190.52,
          hdop: undefined
        },
        '1613364500':  {
          lat: 3.353902,
          lon: 123.754353,
          timestamp: 1613364500,
          altitude: undefined,
          speed: 16.403164,
          heading: 191.97,
          hdop: undefined
        },
        '1613364508':  {
          lat: 40.353902,
          lon: 123.754353,
          timestamp: 1613364508,
          altitude: 1,
          speed: 16.403164,
          heading: 191.97,
          hdop: 0.6
        },
        '1613364509':  {
          lat: 41.353864,
          lon: 123.754345,
          timestamp: 1613364509,
          altitude: 0.9,
          speed: 14.078904000000001,
          heading: 191.39,
          hdop: 0.6
        },
        '1613364510':  {
          lat: 42.353831,
          lon: 123.754338,
          timestamp: 1613364510,
          altitude: undefined,
          speed: 12.623232,
          heading: 188.82,
          hdop: undefined
        },
        '1613364513':  {
          lat: 43.353802,
          lon: 123.754334,
          timestamp: 1613364513,
          altitude: undefined,
          speed: 10.048952000000002,
          heading: 190.52,
          hdop: undefined
        }
      };
    const waypointOutput = DDPAI.gpxToWayPointDict(preprocessedOutput.content);
    TEST_COMMON.assert(TEST_COMMON.isObjectEqual(waypointOutput, expectWaypointOutput), 'gpxToWayPointDict');
}

console.log('Test passed');
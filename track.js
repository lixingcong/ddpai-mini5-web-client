"use strict"

export {
	toFile,
    distance
};

import * as KML from './kml.js';
import * as GPX from './gpx.js';
import * as DF from './date-format.js';

/**
 * 整合多个段为单独连续的一部分 https://leetcode.com/problems/merge-intervals
 *
 * @param {tracks} 轨迹二维数组：第一维表示轨迹数，第二维为按时间先后顺序的点位数组（WayPoint类型）
 * @param {format} 文件格式，有效值：'kml'
 * @param {description} 文件描述（注释）
 * @param {enableTrack} 布尔值，是否导出轨迹（含完整时间信息）
 * @param {enableLine} 布尔值，是否导出路径（不含时间，仅做线条绘制）
 * @param {timestampFormat} 将时间戳转为人类阅读的fmt，例如 'yyyy-MM-dd hh:mm'，依赖date-format.js
 * 
 * @return {string} 完整的文件内容
 */
function toFile(tracks, format, description, enableTrack, enableLine, timestampFormat)
{
    if(0 >= tracks.length)
        return undefined;

    let trackIndex = 0;
    let trackIndexSuffix = ': ';

    const localTs = (ts) => DF.timestampToString(ts, timestampFormat, false); // 本地时间
    const LatLonDecimalPrecision = 7; // 经纬度的小数位数

    if('kml' == format){
        let body = '';

        tracks.forEach(wayPoints => {
            const WayPointCount = wayPoints.length;
            if(WayPointCount <= 0)
                return; // ignore the empty wayPoints
            
            const WayPointFrom = wayPoints[0];
            const WayPointTo = wayPoints[WayPointCount-1];
            const FolderDesciption = localTs(WayPointFrom.timestamp) + ' to ' + localTs(WayPointTo.timestamp);

            // 文件夹开始
            if(tracks.length>1){
                trackIndex++;
                trackIndexSuffix = ' ' + trackIndex + ': ';

                body += KML.folderHead('Folder' + trackIndexSuffix + FolderDesciption);
            }

            // 起点
            body += KML.placemarkHead('Start'+ trackIndexSuffix + localTs(WayPointFrom.timestamp), undefined, undefined, WayPointFrom.timestamp);
            body += KML.placemarkPoint(WayPointFrom.lat, WayPointFrom.lon, LatLonDecimalPrecision);
            body += KML.placemarkTail();

            // 终点
            if(WayPointCount>0){
                body += KML.placemarkHead('End'+ trackIndexSuffix + localTs(WayPointTo.timestamp), undefined, undefined, WayPointTo.timestamp);
                body += KML.placemarkPoint(WayPointTo.lat, WayPointTo.lon, LatLonDecimalPrecision);
                body += KML.placemarkTail();
            }

            // 连线
            if(enableLine){
                body += KML.placemarkHead('Line' + trackIndexSuffix + FolderDesciption, undefined, KML.StyleId.Line, undefined);
                body += KML.lineStringHead();

                wayPoints.forEach(wayPoint => {
                    body += KML.lineStringCoord(wayPoint.lat, wayPoint.lon, LatLonDecimalPrecision);
                });

                body += KML.lineStringTail();
                body += KML.placemarkTail();
            }

            // 轨迹
            if(enableTrack){
                body += KML.placemarkHead('Track' + trackIndexSuffix + FolderDesciption, undefined, KML.StyleId.Track, undefined);
                body += KML.trackHead();
                body += KML.altitudeMode(KML.AltitudeMode.Absolute);
                wayPoints.forEach(wayPoint => {
                    body += KML.trackCoord(wayPoint.lat, wayPoint.lon, wayPoint.altitude, LatLonDecimalPrecision, wayPoint.timestamp);
                });
                body += KML.trackTail();
                body += KML.placemarkTail();
            }

            // 文件夹结束
            if(tracks.length>1){
                body += KML.folderTail();
            }
        });

        return KML.head(description) + body + KML.tail();
    } else if ('gpx' == format) {
        let body = '';

        tracks.forEach(wayPoints => {
            const WayPointCount = wayPoints.length;
            if (WayPointCount <= 0)
                return; // ignore the empty wayPoints

            const WayPointFrom = wayPoints[0];
            const WayPointTo = wayPoints[WayPointCount - 1];
            const FolderDesciption = localTs(WayPointFrom.timestamp) + ' to ' + localTs(WayPointTo.timestamp);

            // 文件夹开始
            if(tracks.length>1){
                trackIndex++;
                trackIndexSuffix = ' ' + trackIndex + ': ';
            }

            // 起点
            body += GPX.wpt(WayPointFrom.lat, WayPointFrom.lon, WayPointFrom.altitude, LatLonDecimalPrecision, 'Start' + trackIndexSuffix + localTs(WayPointFrom.timestamp));

            // 终点
            if (WayPointCount > 0) {
                body += GPX.wpt(WayPointTo.lat, WayPointTo.lon, WayPointTo.altitude, LatLonDecimalPrecision, 'End' + trackIndexSuffix + localTs(WayPointTo.timestamp));
            }

            // 连线
            if (enableLine) {
                body += GPX.rteHead('Route' + trackIndexSuffix + FolderDesciption);
                wayPoints.forEach(wayPoint => {
                    body += GPX.rtept(wayPoint.lat, wayPoint.lon, LatLonDecimalPrecision);
                });
                body += GPX.rteTail();
            }

            // 轨迹
            if (enableTrack) {
                body += GPX.trkHead('Track' + trackIndexSuffix + FolderDesciption);
                wayPoints.forEach(wayPoint => {
                    body += GPX.trkpt(wayPoint.lat, wayPoint.lon, wayPoint.altitude, LatLonDecimalPrecision, wayPoint.timestamp);
                });
                body += GPX.trkTail();
            }
        });

        return GPX.head(description) + body + GPX.tail();
    }

    return undefined;
}

// wayPoints 轨迹数组：按时间先后顺序的点位数组（WayPoint类型）
// speedThreshold 速度阈值，若某点瞬间速度大于该值（单位：km/h），则累积该位移
// distanceThreshold 距离阈值，若与上一点的距离大于该值（单位：米），则累积该位移
function distance(wayPoints, speedThreshold = 1.5, distanceThreshold = 50){
	let distance = 0.0;
	let lastWayPoint = undefined;

	wayPoints.forEach(wayPoint => {
		const speed = wayPoint.hasSpeed() ? wayPoint.speed : 0.0;
        const thisDistance = wayPoint.distanceTo(lastWayPoint);

		if (speed > speedThreshold || thisDistance > distanceThreshold) {
			distance += thisDistance;
            lastWayPoint = wayPoint;
		}
	});
    return distance;
}
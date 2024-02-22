"use strict"

export {
    Point,
    Path,
    TrackFile,
    PaintPoint,
    PaintCmd,
    PaintResult,
    paint
};

import * as KML from './kml.js';
import * as GPX from './gpx.js';
import * as WP from './waypoint.js';

class Point
{
    constructor(name, wayPoint, description)
    {
        this.name = name;
        this.description = description;
        this.wayPoint = wayPoint;
    }
}

class Path
{
    constructor(name, wayPoints, description)
    {
        this.name = name;
        this.description = description;
        this.wayPoints = wayPoints;
    }
}

class TrackFile
{
    constructor(name)
    {
        this.name = name; // 文档名字
        this.description = undefined;
        this.points = []; // Point对象数组
        this.lines = []; // Path对象数组，没有时间戳
        this.tracks = []; // Path对象数组
    }

    toKMLDocument()
    {
        let document = new KML.Document(this.name);
        document.description = this.description;

        const BlueStyle = new KML.Style('BlueStyle','A0FF0000',5);
        const GreenStyle = new KML.Style('GreenStyle','D032FF30',5);
        document.styles=[BlueStyle, GreenStyle];

        const AltitudeMode = KML.AltitudeMode.Absolute;

        // WP.WayPoint转KML坐标
        const wp2KmlGxCoord = wp => new KML.GxCoord(wp.lat, wp.lon, wp.altitude);
        const wp2KmlCoordinate = wp => new KML.Coordinate(wp.lat, wp.lon, wp.altitude);

        // 点位
        if(1==this.points.length){
            const point = this.points[0];
            let placeMark = new KML.PlaceMark(point.name);
            placeMark.description = point.description;
            placeMark.point = new KML.Point(wp2KmlCoordinate(point.wayPoint), AltitudeMode);
            document.placeMarks.push(placeMark);
        }else if(1<this.points.length){
            let folder= new KML.Folder('Points');
            folder.placeMarks = this.points.map(point => {
                let placeMark = new KML.PlaceMark(point.name);
                placeMark.description = point.description;
                placeMark.point = new KML.Point(wp2KmlCoordinate(point.wayPoint), AltitudeMode);
                return placeMark;
            });
            document.folders.push(folder);
        }

        // 线条
        if(1==this.lines.length){
            const path = this.lines[0];
            let placeMark = new KML.PlaceMark(path.name);
            placeMark.description = path.description;
            placeMark.lineString = new KML.LineString(new KML.Coordinates(path.wayPoints.map(wp => wp2KmlCoordinate(wp))), KML.AltitudeMode.ClampToGround);
            placeMark.styleId=GreenStyle.id;
            document.placeMarks.push(placeMark);
        }else if(1<this.lines.length){
            let folder= new KML.Folder('Routes');
            folder.placeMarks = this.lines.map(path => {
                let placeMark = new KML.PlaceMark(path.name);
                placeMark.description = path.description;
                placeMark.lineString = new KML.LineString(new KML.Coordinates(path.wayPoints.map(wp => wp2KmlCoordinate(wp))), KML.AltitudeMode.ClampToGround);
                placeMark.styleId=GreenStyle.id;
                return placeMark;
            });
            document.folders.push(folder);
        }

        // 轨迹
        if(1==this.tracks.length){
            const path = this.tracks[0];
            let placeMark = new KML.PlaceMark(path.name);
            placeMark.description = path.description;
            placeMark.gxTrack = new KML.GxTrack(AltitudeMode);
            path.wayPoints.forEach(wp => { placeMark.gxTrack.append(new KML.When(wp.timestamp), wp2KmlGxCoord(wp)); });
            placeMark.styleId=BlueStyle.id;
            document.placeMarks.push(placeMark);
        }else if(1<this.tracks.length){
            let folder= new KML.Folder('Tracks');
            folder.placeMarks = this.tracks.map(path => {
                let placeMark = new KML.PlaceMark(path.name);
                placeMark.description = path.description;
                placeMark.gxTrack = new KML.GxTrack(AltitudeMode);
                path.wayPoints.forEach(wp => { placeMark.gxTrack.append(new KML.When(wp.timestamp), wp2KmlGxCoord(wp)); });
                placeMark.styleId=BlueStyle.id;
                return placeMark;
            });
            document.folders.push(folder);
        }

        return document;
    }

    static fromKMLDocument(document)
    {
        if(undefined == document)
            return undefined;

        let ret = new TrackFile(document.name);
        ret.description = document.description;

        // KML坐标转WP.WayPoint
        const kmlCoord2Wp = c => new WP.WayPoint(c.lat, c.lon, undefined, c.altitude);

        const gxTrackToWayPoints = gxTrack => {
            const timestamps = gxTrack.whenArray.map(w => w.timestamp);
            let wayPoints = gxTrack.gxCoordArray.map(g => kmlCoord2Wp(g));
            const len = Math.min(timestamps.length, wayPoints.length);
            for(let i=0;i<len;++i)
                wayPoints[i].timestamp=timestamps[i];
            return wayPoints;
        }

        const parsePlaceMarks = placeMarks => {
            placeMarks.forEach(placeMark => {
                if(undefined != placeMark.point)
                    ret.points.push(new Point(placeMark.name, kmlCoord2Wp(placeMark.point.coordinate), placeMark.description));

                if(undefined != placeMark.gxTrack)
                    ret.tracks.push(new Path(placeMark.name, gxTrackToWayPoints(placeMark.gxTrack), placeMark.description));

                if(undefined != placeMark.gxMultiTrack){
                    // TODO: KML中MultiTrack是否要对应GPX的中的trkseg字段
                    let wayPoints = [];
                    placeMark.gxMultiTrack.gxTracks.forEach(gxTrack => {
                        wayPoints = wayPoints.concat(gxTrackToWayPoints(gxTrack))
                    });
                    ret.tracks.push(new Path(placeMark.name, wayPoints, placeMark.description));
                }

                if(undefined != placeMark.lineString)
                    ret.lines.push(new Path(placeMark.name,
                        placeMark.lineString.coordinates.coordinateArray.map(c => kmlCoord2Wp(c)),
                        placeMark.description));
            });
        }

        parsePlaceMarks(document.placeMarks);

        if(undefined!=document.folders){
            document.folders.forEach(folder => {
                parsePlaceMarks(folder.placeMarks);
            });
        }

        return ret;
    }

    toGPXDocument()
    {
        let document = new GPX.Document(this.name);
        document.description = this.description;

        // WP.WayPoint转GPX.Wpt
        const wp2GpxWpt = (wp,name,description) => new GPX.Wpt(name, wp.lat, wp.lon, wp.altitude, wp.timestamp, description);

        document.wpts=this.points.map(point => wp2GpxWpt(point.wayPoint, point.name, point.description));
        document.rtes=this.lines.map(path => new GPX.Rte(path.name, path.wayPoints.map(wp => wp2GpxWpt(wp)), path.description));
        document.trks=this.tracks.map(path => new GPX.Trk(path.name, [new GPX.Trkseg(path.wayPoints.map(wp => wp2GpxWpt(wp)))], path.description));
        return document;
    }

    static fromGPXDocument(document)
    {
        if(undefined == document)
            return undefined;

        let ret = new TrackFile(document.name);
        ret.description = document.description;

        // GPX.Wpt转WP.WayPoint
        const gpxWpt2Wp = wpt => new WP.WayPoint(wpt.lat, wpt.lon, wpt.timestamp, wpt.altitude);

        ret.points=document.wpts.map(wpt => new Point(wpt.name, gpxWpt2Wp(wpt), wpt.description));
        ret.lines=document.rtes.map(rte => new Path(rte.name, rte.rtepts.map(rtept => gpxWpt2Wp(rtept)), rte.description));
        ret.tracks=document.trks.map(trk => {
            let wayPoints = [];
            trk.trksegs.forEach(trkseg => {
                trkseg.trkpts.forEach(trkpt => {
                    wayPoints.push(gpxWpt2Wp(trkpt));
                });
            });
            return new Path(trk.name, wayPoints, trk.description);
        });
        return ret;
    }
}

class Rect
{
    constructor(x1,y1,x2,y2)
    {
        this.topLeftX = undefined == x1 ? Number.MAX_SAFE_INTEGER : x1;
        this.topLeftY = undefined == y1 ? Number.MAX_SAFE_INTEGER : y1;
        this.bottomRightX = undefined == x2 ? Number.MIN_SAFE_INTEGER : x2;
        this.bottomRightY = undefined == y2 ? Number.MIN_SAFE_INTEGER : y2;
    }

    isValid()
    {
        return Number.MAX_SAFE_INTEGER!=this.topLeftX && Number.MAX_SAFE_INTEGER!=this.topLeftY && Number.MIN_SAFE_INTEGER!=this.bottomRightX && Number.MIN_SAFE_INTEGER!=this.bottomRightY;
    }

    center()
    {
        return [(this.topLeftX+this.bottomRightX )/2, (this.topLeftY+this.bottomRightY)/2];
    }

    width() {
        return Math.abs(this.bottomRightX - this.topLeftX);
    }

    height(){
        return Math.abs(this.bottomRightY - this.topLeftY);
    }

    scale(f)
    {
        this.topLeftX *= f;
        this.topLeftY *= f;
        this.bottomRightX *= f;
        this.bottomRightY *= f;
    }

    merge(other)
    {
        this.topLeftX = Math.min(this.topLeftX, other.topLeftX);
        this.topLeftY = Math.min(this.topLeftY, other.topLeftY);
        this.bottomRightX = Math.max(this.bottomRightX, other.bottomRightX);
        this.bottomRightY = Math.max(this.bottomRightY, other.bottomRightY);
    }

    static fromPoints(xyArray)
    {
        const MaxMinValue = arr => [Math.max.apply(null, arr), Math.min.apply(null, arr) ];

        const X = MaxMinValue(xyArray.map(a => a[0]));
        const Y = MaxMinValue(xyArray.map(a => a[1]));

        return new Rect(X[1],Y[1],X[0],Y[0]);
    }
}

const PaintCmd = {
    TrackStart:0,
    TrackPoint:1,
    TrackEnd:2
};

class PaintPoint {
    constructor(x, y, cmd) {
        this.x = x;
        this.y = y;
        this.cmd = cmd; // PaintCmd
    }
}

class PaintResult {
    constructor(paintPoints=[], horizontalDistance=0, verticalDistance=0)
    {
        this.points = paintPoints;
        this.horizontalDistance = horizontalDistance; // 画布的实际距离（米）
        this.verticalDistance = verticalDistance;

        this.topLeft = undefined; // PaintPoint对象，指示这些点位构成的Rect左上角
        this.bottomRight = undefined;
    }
}

// 简单比较两数是否相等
const fuzzyCompare = (a,b) => Math.abs(a-b) < 0.01;

/**
 * 将多个轨迹打印到长宽(像素)的图片上
 *
 * @param {array} paths 多个路径，Path对象数组
 * @param {int} width 图片长度
 * @param {int} height 图片高度
 * @return {PaintResult}
 */
function paint(paths, width, height) {
    if(!width || !height)
        return undefined; // invalid

    let rect = new Rect();
    let XY = [];

    paths.forEach(path => {
        let xy = path.wayPoints.map(wp => wp.toXY());
        xy = xy.map(p => [p[0], -p[1]]); // 反转Y（屏幕坐标系Y方向不一致）
        XY.push(xy);
        rect.merge(Rect.fromPoints(xy));
    });

    let ret = new PaintResult();

    if(!rect.isValid())
        return ret; // invalid

    let RWidth = rect.width();
    let RHeight = rect.height();

    const RWidthFact=RWidth; // 实际轨迹边框尺寸
    const RHeightFact=RHeight;

    {
        // 将源点位平移到中点，然后归一化到[-0.5,0.5]
        const center = rect.center();
        XY = XY.map(xy =>
            xy.map(p => [
                (p[0] - center[0]) / RWidth,
                (p[1] - center[1]) / RHeight
            ])
        );
    }

    // 缩放rect直至适合窗口大小
    do {
        let changed = true;
        if (RWidth < width && RHeight < height) {
            rect.scale(width / RWidth); // 若rect比画布小，先任意调整，会继续循环体
        } else if (RWidth > width)
            rect.scale(width / RWidth);
        else if (RHeight > height)
            rect.scale(height / RHeight);
        else
            changed = false;

        if (changed) {
            RWidth = rect.width();
            RHeight = rect.height();
        } else
            break; // finish
    } while (1);

    //console.log('fit rect to w=' + RWidth + ', h=' + RHeight);

    if(fuzzyCompare(RWidth, width)){
        ret.horizontalDistance=RWidthFact;
        ret.verticalDistance=RWidthFact*(height/width);
    }else{
        ret.verticalDistance=RHeightFact;
        ret.horizontalDistance=RHeightFact*(width/height);
    }

    const PicCenterX = width / 2;
    const PicCenterY = height / 2;

    XY.forEach(xy => {
        const paintPoints = xy.map(p => new PaintPoint(
            p[0] * RWidth + PicCenterX,
            p[1] * RHeight + PicCenterY,
            PaintCmd.TrackPoint
        ));

        const p1=paintPoints[0];
        const p2=paintPoints[paintPoints.length-1];

        p1.cmd=PaintCmd.TrackStart;
        p2.cmd=PaintCmd.TrackEnd;

        ret.points = ret.points.concat(paintPoints);
    });

    ret.topLeft = new PaintPoint(-0.5*RWidth + PicCenterX, -0.5*RHeight + PicCenterY);
    ret.bottomRight = new PaintPoint(0.5*RWidth + PicCenterX, 0.5*RHeight + PicCenterY);

    return ret;
}
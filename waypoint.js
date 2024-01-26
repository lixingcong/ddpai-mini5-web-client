"use strict"

export {
    WayPoint,
    wayDistance
};

const deg2rad = d => d * Math.PI / 180.0;
const M_PI_4 = Math.PI / 4;

// 地球半径
const WGS84_RADIUS = 6378137;

class WayPoint {
    constructor(lat = undefined, lon = undefined, timestamp = undefined, altitude = undefined)
    {
        // 必需项目
        this.lat = lat; // 十进制纬度 latitude
        this.lon = lon; // 十进制经度 longitude

        // 可选项目
        this.timestamp = timestamp; // Unix时间戳（秒）
        this.altitude = altitude; // 海拔高度单位：米
        this.speed = undefined; // 速度单位：km/h
        this.heading = undefined; // 航向单位：度
        this.hdop = undefined; // 水平精度单位：米
    }

    hasGeometry() { return undefined != this.lon && undefined != this.lat;}
    hasTimestamp() { return undefined != this.timestamp;}
    hasAltitude() {return undefined != this.altitude;}
    hasSpeed() { return undefined != this.speed;}
    hasHeading() {return undefined != this.heading;}
    hasHdop() {return undefined != this.hdop;}

    // 与另一点的地球距离(WGS84)，返回数字（单位：米）
    // 参数other为另一WayPoint，也可为undefined，此时返回0
    distanceTo(other)
    {
        if(undefined == other)
            return 0;

        const dx = this.lon - other.lon;
        const dy = this.lat - other.lat;
        const b = (this.lat + other.lat) / 2.0;
        const Lx = deg2rad(dx) * WGS84_RADIUS * Math.cos(deg2rad(b));
        const Ly = WGS84_RADIUS * deg2rad(dy);
        const meter = Math.sqrt(Lx * Lx + Ly * Ly);

        return meter;
    }

    // 使用WebMercator投影算法将WGS84经纬度转为平面XY值，返回[x,y]
    // https://github.com/tumic0/GPXSee/blob/master/src/map/proj/webmercator.cpp
    toXY()
    {
        return [
            deg2rad(this.lon) * WGS84_RADIUS,
            Math.log(Math.tan(M_PI_4 + deg2rad(this.lat)/2.0)) * WGS84_RADIUS
        ];
    }
}

// wayPoints 轨迹数组：按时间先后顺序的点位数组（WayPoint类型）
// speedThreshold 速度阈值，若某点瞬间速度大于该值（单位：km/h），则累积该位移
// distanceThreshold 距离阈值，若与上一点的距离大于该值（单位：米），则累积该位移
function wayDistance(wayPoints, speedThreshold = 1.5, distanceThreshold = 50){
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

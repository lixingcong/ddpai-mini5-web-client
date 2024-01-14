"use strict"

export {
    WayPoint
};

class WayPoint {
    constructor()
    {
        // 必需项目
        this.timestamp = undefined; // Unix时间戳（秒）
        this.lon = undefined; // 十进制经度 longitude
        this.lat = undefined; // 十进制纬度 latitude

        // 可选项目
        this.speed = undefined; // 速度单位：km/h
        this.heading = undefined; // 航向单位：度
        this.hdop = undefined; // 水平精度单位：米
        this.altitude = undefined; // 海拔高度单位：米
    }

    // 判断必需项目
    isValid()
    {
        return undefined != this.timestamp
            && undefined != this.lon
            && undefined != this.lat;
    };

    // 判断可选项目
    hasSpeed() { return undefined != this.speed;};
    hasHeading() {return undefined != this.heading;};
    hasHdop() {return undefined != this.hdop;};
    hasAltitude() {return undefined != this.altitude;};

    // 度数转弧度
    static deg2rad(degree)
    {
        return degree * Math.PI / 180.0;
    }

    // 与另一点的地球距离(WGS84)，返回数字（单位：米）
    // 参数other为另一WayPoint，也可为undefined，此时返回0
    distanceTo(other)
    {
        if(undefined == other)
            return 0;

        const dx = this.lon - other.lon;
        const dy = this.lat - other.lat;
        const b = (this.lat + other.lat) / 2.0;
        const Lx = WayPoint.deg2rad(dx) * 6367000.0 * Math.cos(WayPoint.deg2rad(b));
        const Ly = 6367000.0 * WayPoint.deg2rad(dy);
        const meter = Math.sqrt(Lx * Lx + Ly * Ly);

        return meter;
    }
}
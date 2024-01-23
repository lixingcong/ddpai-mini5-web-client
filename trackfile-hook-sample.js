"use strict"

export {
    timeShift,
    clearInvalidAltitude,
    fixDescription,
    removeAll,
    removeSlightlyMoveCoords,
    print
};

/**
 * 时间加上固定偏移，一般用于时区校正
 */
function timeShift(trackFile) {
    const OffsetHour = -4; // 向前调整4小时
    const OffsetSecond = OffsetHour * 3600;
    const Offset = (wp) => { wp.timestamp += OffsetSecond; }

    trackFile.points.forEach((point) => { Offset(point.wayPoint); });
    trackFile.lines.forEach((path) => { path.wayPoints.forEach(Offset); });
    trackFile.tracks.forEach((path) => { path.wayPoints.forEach(Offset); });
}

/**
 * 搜索坐标海拔为0的点，并将其海拔置为空白（去除噪声数据）
 */
function clearInvalidAltitude(trackFile) {
    const Clear = (wp) => { if (0 == wp.altitude) wp.altitude = undefined; }

    trackFile.points.forEach((point) => { Clear(point.wayPoint); });
    trackFile.lines.forEach((path) => { path.wayPoints.forEach(Clear); });
    trackFile.tracks.forEach((path) => { path.wayPoints.forEach(Clear); });
}

/**
 * 判断描述字段是否为CDATA，若是，则加上正确的标签。
 *
 * 在两步路App导出的轨迹可能会生成不合法的KML描述：如
 *
 * <description>
 *   <div>通过“两步路”生成</div>
 *   <div>上传者:ABC</div>
 *   <div>开始时间:2020-09-20 09:01:05</div>
 *   <div>结束时间:2020-09-20 18:19:50</div>
 * </description>
 *
 * 需要给这段desc加上CDATA起始末尾标签，生成结果：
 *  <description>
 *    <![CDATA[通过“两步路”生成]]>
 *    <![CDATA[上传者:ABC]]>
 *    <![CDATA[开始时间:2020-09-20 09:01:05]]>
 *    <![CDATA[结束时间:2020-09-20 18:19:50]]>
 *  </description>
 *
 * 有的KML轨迹甚至转义div写入到kml文件中：如
 *
 * <description>
 *    &lt;div&gt;时间：2020-10-18 06:14:26&lt;/div&gt;
 * </description>
 *
 * 需要给这段desc加上CDATA起始末尾标签，生成结果：
 *
 * <description>
 *   <![CDATA[<div>时间：2020-10-18 06:14:26</div>]]>
 * </description>
 */
function fixDescription(trackFile) {
    // 匹配<tagName>开头和</tagName>结尾
    const Regex = /^\<[a-zA-z0-9]*?\>.*\<\/[a-zA-z0-9]*?\>$/;
    const Check = (o) => {
        if(undefined == o.description)
            return;
        if (typeof o.description === 'string' && o.description.match(Regex))
            o.description = { '__cdata': o.description };
        else if(typeof o.description === 'object' && 'div' in o.description)
            o.description = { '__cdata': o.description.div};
    }

    Check(trackFile);
    trackFile.points.forEach(Check);
    trackFile.lines.forEach(Check);
    trackFile.tracks.forEach(Check);
}

/**
 * 移除轨迹文件中的点、线、轨迹
 */
function removeAll(trackFile) {
    trackFile.points = [];
    trackFile.lines = [];
    trackFile.tracks = [];
}

/**
 * 精简轨迹（按位移阈值对轨迹抽样）
 * 将位移距离小于10米的点位剔除，只保留位移大于10米的点
 */
function removeSlightlyMoveCoords(trackFile) {
    const MinDistance = 10;
    const Check = (path) => {
        let lastWayPoint = undefined;
        path.wayPoints.forEach((wp, idx, arr) => {
            if (undefined == lastWayPoint) {
                  lastWayPoint = wp;
                return;
            }
            if (lastWayPoint.distanceTo(wp) < MinDistance)
                arr[idx] = undefined; // remove it
            else
                lastWayPoint = wp;
        });

        path.wayPoints = path.wayPoints.filter(wp => undefined != wp);
    };

    trackFile.lines.forEach(Check);
    trackFile.tracks.forEach(Check);
}

/**
 * 将轨迹打印到调试终端，以JSON形式展现，可以提供给其它编程语言进行进一步处理
 */
function print(trackFile) {
    console.log(JSON.stringify(trackFile));
    // alert('Press F12 to grab the output');
}
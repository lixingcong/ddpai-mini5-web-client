"use strict"

export {
    timeShift,
    clearInvalidAltitude,
    fixDescription,
    removeAll,
    sampleByDistance,
    sampleByTimeInterval,
    sampleByIndexInterval
};

/**
 * 时间加上固定偏移，一般用于时区校正
 */
function timeShift(trackFile) {
    const OffsetHour = -4; // 向前调整4小时
    const OffsetSecond = OffsetHour * 3600;
    const Offset = wp => { if(undefined != wp.timestamp) wp.timestamp += OffsetSecond; }

    trackFile.points.forEach(point => { Offset(point.wayPoint); });
    trackFile.lines.forEach(path => { path.wayPoints.forEach(Offset); });
    trackFile.tracks.forEach(path => { path.wayPoints.forEach(Offset); });
}

/**
 * 搜索坐标海拔为0的点，并将其海拔置为空白（去除噪声数据）
 */
function clearInvalidAltitude(trackFile) {
    const Clear = wp => { if (0 == wp.altitude) wp.altitude = undefined; }

    trackFile.points.forEach(point => { Clear(point.wayPoint); });
    trackFile.lines.forEach(path => { path.wayPoints.forEach(Clear); });
    trackFile.tracks.forEach(path => { path.wayPoints.forEach(Clear); });
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
    const Check = o => {
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
 * 对轨迹抽样，精简轨迹（按位移阈值）
 * 将位移距离小于10米的点位剔除，只保留位移大于10米的点
 * 注意：首尾两点不会被移除
 */
function sampleByDistance(trackFile) {
    const MinDistance = 10;
    const Check = path => {
        let lastWayPoint = undefined;
        const tailIdx = path.wayPoints.length - 1;
        path.wayPoints.forEach((wp, idx, arr) => {
            if (undefined == lastWayPoint || tailIdx == idx) {
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
 * 对轨迹抽样，精简轨迹（按固定时间间隔）
 * 注意：首尾两点不会被移除
 */
function sampleByTimeInterval(trackFile) {
    const Interval = 2; // 每2秒取样
    const Check = path => {
        let lastWayPoint = undefined;
        const tailIdx = path.wayPoints.length - 1;
        path.wayPoints.forEach((wp, idx, arr) => {
            if (undefined == lastWayPoint || tailIdx == idx) {
                  lastWayPoint = wp;
                return;
            }
            if (wp.timestamp - lastWayPoint.timestamp < Interval)
                arr[idx] = undefined; // remove it
            else
                lastWayPoint = wp;
        });

        path.wayPoints = path.wayPoints.filter(wp => undefined != wp);
    };

    trackFile.tracks.forEach(Check);
}

/**
 * 对轨迹抽样，精简轨迹（按固定间隔点数）
 * 注意：首尾两点不会被移除
 */
function sampleByIndexInterval(trackFile) {
    const Interval = 3; // 每3个点取样
    const Check = path => {
        let lastIndex = undefined;
        const tailIdx = path.wayPoints.length - 1;
        path.wayPoints.forEach((wp, idx, arr) => {
            if (undefined == lastIndex || tailIdx == idx) {
                  lastIndex = 0;
                return;
            }
            if (idx - lastIndex < Interval)
                arr[idx] = undefined; // remove it
            else
                lastIndex = idx;
        });

        path.wayPoints = path.wayPoints.filter(wp => undefined != wp);
    };

    trackFile.tracks.forEach(Check);
    trackFile.lines.forEach(Check);
}

/**
 * 将轨迹以json形式输出到浏览器下载栏，可以提供给其它编程语言进行进一步处理
 */
function downloadAsJson(trackFile) {
    const filename = '导出'+trackFile.name+'.json'
    const newLink = $('<a>', {
        text: filename,
        download: filename,
        href: URL.createObjectURL(new Blob([JSON.stringify(trackFile, null, 2)]))
    });

    const div =  $('#exportedTrackList');
    div.append(newLink);
    div.append('<br/>');
}
"use strict"

import * as UTILS from './utils.js';
import * as TRACK from './track.js';

export {
    newRootDiv,
    newDownloadLinkDiv,
    newHintDiv,
    newCanvasDiv,
    CanvasDefaultWidth,
    CanvasDefaultHeight
}

// 预览轨迹的画布大小
const CanvasDefaultWidth=64;
const CanvasDefaultHeight=42;

// 画布的起终点圆点半径
const CanvasPointRadius = 3;

const newRootDiv = () => $('<div>', { 'class': 'btn-container' });

const newDownloadLinkDiv = (blob, name) => {
    let div = $('<div>', { class: 'btn-spacer' });
    const a = $('<a>', {
        text: name,
        download: name,
        href: URL.createObjectURL(blob)
    });
    div.append(a);
    div.append(', ' + UTILS.byteToHumanReadableSize(blob.size));

    return div;
}

const newHintDiv = (prefix, wpFrom, wpTo, distance, addToClass) => {
    let t = prefix;
    const duration = wpTo.timestamp - wpFrom.timestamp;
    if (duration > 0) {
        t += '耗时' + UTILS.secondToHumanReadableString(duration);
        t += '，直线' + UTILS.meterToString(wpFrom.distanceTo(wpTo));
        if (distance > 0)
            t += '，里程' + UTILS.meterToString(distance);
    }

    return $('<div>', { text: t, class: addToClass ? 'btn-spacer' : undefined });
}

/**
 * @param {[TRACK.PaintPoint]} paintPoints Track.paint()返回的结果中的点位数组。
 * @param {bool} showEdgePoint 是否绘制起始点、结束点
 * @param {int} width 画布大小
 * @param {int} height 画布大小
 * @returns div
 */
const newCanvasDiv = (paintPoints, showEdgePoint, width = CanvasDefaultWidth, height = CanvasDefaultHeight) => {
    const canvas = document.createElement('canvas');
    const div = document.createElement('div');

    div.className = 'btn-spacer';
    div.appendChild(canvas);

    canvas.width = width + CanvasPointRadius * 2;
    canvas.height = height + CanvasPointRadius * 2;

    const ctx = canvas.getContext('2d');

    let startPts=[];
    let endPts=[];

    ctx.lineWidth = 1;
    ctx.strokeStyle = 'black';
    paintPoints.forEach(paintPoint => {
        const pt = [paintPoint.x + CanvasPointRadius, paintPoint.y + CanvasPointRadius];

        switch(paintPoint.cmd){
            case TRACK.PaintCmd.TrackStart:
                ctx.beginPath();
                ctx.moveTo(pt[0], pt[1]);
                startPts.push(pt);
                break;
            case TRACK.PaintCmd.TrackPoint:
                ctx.lineTo(pt[0], pt[1]);
                break;
            case TRACK.PaintCmd.TrackEnd:
                ctx.stroke();
                endPts.push(pt);
                break;
        }
    });

    if(showEdgePoint){
        ctx.fillStyle = '#02f21a';
        startPts.forEach(pt => {
            ctx.beginPath();
            ctx.arc(pt[0], pt[1], CanvasPointRadius, 0, Math.PI * 2);
            ctx.fill();
        });

        ctx.fillStyle = '#fa5e37';
        endPts.forEach(pt => {
            ctx.beginPath();
            ctx.arc(pt[0], pt[1], CanvasPointRadius, 0, Math.PI * 2);
            ctx.fill();
        });
    }

    return div;
}
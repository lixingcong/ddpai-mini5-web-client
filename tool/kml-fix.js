"use strict"

// 本文件已废弃，因为convert.html中已支持自定义javascript脚本加载trackfile的钩子函数
// 仅供终端执行，用于kml文件的简单修复

import * as TRACK from '../track.js'
import * as KML from '../kml.js';
import path from 'path';
import { fileURLToPath } from 'url';
import * as fs from 'fs';

function getArgs() {
    // https://stackoverflow.com/a/54098693/5271632
    const args = {};
    process.argv
        .slice(2, process.argv.length)
        .forEach(arg => {
            // long arg
            if (arg.slice(0, 2) === '--') {
                const longArg = arg.split('=');
                const longArgFlag = longArg[0].slice(2, longArg[0].length);
                const longArgValue = longArg.length > 1 ? longArg[1] : true;
                args[longArgFlag] = longArgValue;
            }
            // flags
            else if (arg[0] === '-') {
                const flags = arg.slice(1, arg.length).split('');
                flags.forEach(flag => {
                    args[flag] = true;
                });
            }
        });
    return args;
}

function printHelp()
{
    const Filepath = fileURLToPath(import.meta.url);
    const Dirname = path.dirname(Filepath);
    const Filename = Filepath.substring(Dirname.length+1);

    console.log('Usage:');
    console.log('  node '+ Filename+' [OPTIONS] --input=/path/to/1.kml --output=/path/to/2.kml');
    console.log('OPTIONS:')
    console.log('  --removeAltitideCoord=1234    Remove those coords whose altitude is 1234');
    console.log('  --beautify                    Beautify the ouput with indents');
    console.log('  --help                        Print this help');
}

function die(s)
{
    console.error(s);
    console.error('');
    printHelp();
    process.exit(-1);
}

class Args {
    constructor() {
        // 移除<Coordinates>和<gx:coord>中的高度数据，undefined表示参数不生效
        // 如：设置为0，即将所有点中高度为0的高度数据移除
        this.removeAltitideCoord = undefined;

        // 输入文件完整路径
        this.inputFilePath = undefined;

        // 输出文件完整路径
        this.outputFilePath = undefined;

        // 是否美化输出文件（使用缩进）
        this.beautify = false;
    }

    check() {
        if(undefined == this.inputFilePath || !fs.existsSync(this.inputFilePath))
            die('Invalid input file: ' + this.inputFilePath);

        if(undefined == this.outputFilePath)
            die('Please specify output file');
    }
}

let args = new Args;
const InputArgs = getArgs();

Object.keys(InputArgs).forEach(key => {
    const value = InputArgs[key];
    switch (key) {
        case 'input':
            args.inputFilePath = value;
            break;
        case 'output':
            args.outputFilePath = value;
        case 'removeAltitideCoord':
            args.removeAltitideCoord = value;
            break;
        case 'help':
            printHelp();
            process.exit(0);
            break;
        case 'beautify':
            args.beautify = true;
            break;
        default:
            die('Unsupport arg: '+key);
            break;
    }
});

args.check();

fs.readFile(args.inputFilePath, 'utf-8', (error, content) =>{
    if(error)
        die(error);

    const doc = KML.Document.fromFile(content);
    if(!doc)
        die('Invalid kml format: '+args.inputFilePath);

    const trackFile = TRACK.TrackFile.fromKMLDocument(doc);

    // 安装在TrackFile对象上的钩子函数
    trackFile.hookFunc = function()
    {
        // 裁剪不合适的海拔坐标
        const RA = args.removeAltitideCoord;
        if(undefined != RA){
            const checkPathAltitude = (path) => {
                path.wayPoints.forEach((wayPoint) => {
                    if(wayPoint.altitude == RA)
                        wayPoint.altitude.altitude = undefined; // Clear it
                });
            }

            this.points.forEach((point) => {
                if(point.wayPoint.altitude == RA)
                    point.wayPoint.altitude=undefined; // Clear it
            });
            this.lines.forEach(checkPathAltitude);
            this.tracks.forEach(checkPathAltitude);
        }
    }
    trackFile.hookFunc();

    fs.writeFile(args.outputFilePath, trackFile.toKMLDocument().toFile(args.beautify), (error) => {
        if(error)
            die(error);
        console.info('Write ok: '+args.outputFilePath);
    });
});
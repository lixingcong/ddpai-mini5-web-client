"use strict"

export {
    AltitudeMode,
    Document,
    PlaceMark,
    Style,
    Coordinate,
    Coordinates,
    When,
    GxCoord,
    GxTrack,
    GxMultiTrack,
    LineString,
    Folder
};

import * as DF from './date-format.js';
import * as FXP from './js/fxp.min.js';

const toObject = (c) => c.toObject();
const toObjects = (arr) => arr.map( c => c.toObject());
const toStrings = (arr) => arr.map( c => c.toString());

// XML文件中恒为数组的TagName
const AlwaysArray = ['Style', 'Placemark', 'Folder', 'gx:coord', 'when'];

const XMLParserOptions={
    ignoreAttributes: false,
    parseAttributeValue: true,
    attributeNamePrefix: "@",
    isArray: (name, jpath, isLeafNode, isAttribute) => {
        if(isAttribute)
            return false;
        if(jpath.endsWith('gx:MultiTrack.gx:Track')) // 特殊
            return true;
        return AlwaysArray.indexOf(name) !== -1;
    }
};

class Document
{
    constructor(name)
    {
        this.name= name;
        this.description = undefined;
        this.styles = []; // Style对象数组
        this.placeMarks = []; // PlaceMark数组
        this.folders = []; // Folder数组
    }

    toFile(beautify = false)
    {
        const kmlJson={
            '?xml':{
                '@version':'1.0',
                '@encoding':'UTF-8'
            },
            'kml':{
                '@xmlns':'http://www.opengis.net/kml/2.2',
                '@xmlns:gx':'http://www.google.com/kml/ext/2.2',
                'Document': {
                    'name': this.name,
                    'description': this.description,
                    'Style': toObjects(this.styles),
                    'Placemark': toObjects(this.placeMarks),
                    'Folder': toObjects(this.folders)
                }
            }
        };

        const builder = new FXP.fxp.XMLBuilder(Object.assign(XMLParserOptions, {'format':beautify}));
        return builder.build(kmlJson);
    }

    static fromFile(content)
    {
        const parser = new FXP.fxp.XMLParser(XMLParserOptions);
        const kmlJson = parser.parse(content);
        if(kmlJson && 'kml' in kmlJson && 'Document' in kmlJson.kml){
            let ret = new Document(undefined);
            let docJson = kmlJson.kml.Document;
            ret.name = docJson.name;
            ret.description = docJson.description;

            if(undefined != docJson.Style)
                ret.styles = docJson.Style.map(o => Style.fromObject(o));

            if(undefined != docJson.Placemark)
                ret.placeMarks =  docJson.Placemark.map(o => PlaceMark.fromObject(o));

            if(undefined != docJson.Folder)
                ret.folders = docJson.Folder.map(a => Folder.fromObject(a));
            return ret;
        }

        return undefined;
    }
}

class PlaceMark
{
    constructor(name)
    {
        this.name = name;
        this.description = undefined;
        this.styleId = undefined; // 字符串，样式的ID名字
        this.point = undefined; // Coordinates对象
        this.gxTrack = undefined; // GxTrack对象
        this.gxMultiTrack = undefined; // GxMultiTrack对象
        this.lineString = undefined; // LineString对象
    }

    toObject()
    {
        return {
            'name':this.name,
            'description':this.description,
            'styleUrl': (undefined == this.styleId ? undefined : '#' + this.styleId),
            'Point': (undefined == this.point ? undefined : toObject(this.point)),
            'gx:Track':(undefined == this.gxTrack ? undefined : toObject(this.gxTrack)),
            'gx:MultiTrack':(undefined == this.gxMultiTrack ? undefined : toObject(this.gxMultiTrack)),
            'LineString':(undefined == this.lineString ? undefined : toObject(this.lineString))
        };
    }

    static fromObject(o)
    {
        let ret = new PlaceMark;
        ret.name = o.name;
        ret.description = o.description;
        if(undefined != o.styleUrl)
            ret.styleId = o.styleUrl.replace(/^#/g,'');
        if(undefined != o.Point)
            ret.point = Coordinates.fromObject(o.Point);
        if(undefined != o['gx:Track'])
            ret.gxTrack = GxTrack.fromObject(o['gx:Track']);
        if(undefined != o['gx:MultiTrack'])
           ret.gxMultiTrack = GxMultiTrack.fromObject(o['gx:MultiTrack']);
        if(undefined != o.LineString)
            ret.lineString = LineString.fromObject(o.LineString);
        return ret;
    }
}

class Style
{
    constructor(id, lineColor, lineWidth)
    {
        this.id = id;
        this.lineColor = lineColor;
        this.lineWidth = lineWidth;
    }

    toObject()
    {
        return {
            '@id':this.id,
            'LineStyle':{
                'color':this.lineColor,
                'width':this.lineWidth
            }
        };
    }

    static fromObject(o)
    {
        let ret = new Style;
        ret.id = o['@id'];
        ret.lineColor = o.LineStyle.color;
        ret.lineWidth = o.LineStyle.width;
        return ret;
    }
}

class Coordinate
{
    constructor(lat, lon)
    {
        this.lat = lat;
        this.lon = lon;
        this.altitude = undefined;
    }

    toString()
    {
        let ret = this.lon +','+this.lat;
        if(undefined!=this.altitude)
            ret += ',' + this.altitude;
        return ret;
    }

    static fromString(s)
    {
        const splited = s.split(',');
        if(splited.length>=2)
        {
            let ret = new Coordinate(parseFloat(splited[1]), parseFloat(splited[0]));
            if(splited.length >=3)
                ret.altitude = parseFloat(splited[2]);
            return ret;
        }
        return undefined;
    }
}

class Coordinates
{
    constructor(coordinates)
    {
        this.coordinates = coordinates; // Coordinate对象数组
    }

    toObject()
    {
        const coordinateStrs = toStrings(this.coordinates);
        return {
            'coordinates': coordinateStrs.join(' ')
        };
    }

    static fromObject(o)
    {
        const coordinateText = o['coordinates'];
        if(undefined != coordinateText){
            const coordinates = coordinateText.split(' ').map(s => Coordinate.fromString(s));
            return new Coordinates(coordinates);
        }
        return undefined;
    }
}

const AltitudeMode = {
	// 海拔模式 https://developers.google.com/kml/documentation/altitudemode
	RelativeToGround: 'relativeToGround', // 基于地球表面
	Absolute: 'absolute', // 基于海平面
	RelativeToSeaFloor: 'relativeToSeaFloor', // 基于主水体的底部
	ClampToGround: 'clampToGround', //（此项作为默认值）海拔被忽略，沿地形放置在地面上
	ClampToSeaFloor: 'clampToSeaFloor' // 海拔被忽略，沿地形放置在主水体的底部
};

class When
{
    constructor(timestamp)
    {
        this.timestamp = timestamp; // int
    }

    toString()
    {
        return DF.toRfc3339(this.timestamp);
    }

    static fromString(s)
    {
        return new When(DF.fromRfc3339(s));
    }
}

class GxCoord
{
    constructor(lat, lon, altitude=undefined)
    {
        this.lat = lat;
        this.lon = lon;
        this.altitude = altitude;
    }

    toString()
    {
        let gxCoord = this.lon + ' ' + this.lat;
        if(undefined != this.altitude)
            gxCoord += ' ' + this.altitude;
        return gxCoord;
    }

    static fromString(s)
    {
        const splited = s.split(' ');
        if(splited.length>=2)
        {
            let ret = new GxCoord(parseFloat(splited[1]), parseFloat(splited[0]));
            if(splited.length >=3)
                ret.altitude = parseFloat(splited[2]);
            return ret;
        }
        return undefined;
    }
}

class GxTrack
{
    // GPGGA记录中的高度是海平面高度。因此建议值为absolute
    constructor(altitudeMode)
    {
        this.altitudeMode = altitudeMode;
        this.whenArray = []; // When对象数组
        this.gxCoordArray =[]; // GxCoord对象数组
    }

    append(when, gxCoord)
    {
        this.whenArray.push(when);
        this.gxCoordArray.push(gxCoord);
    }

    toObject()
    {
        return {
            'altitudeMode':this.altitudeMode,
            'when': toStrings(this.whenArray),
            'gx:coord': toStrings(this.gxCoordArray)
        }
    }

    static fromObject(o)
    {
        let ret = new GxTrack;
        ret.altitudeMode = o.altitudeMode;
        if(undefined != o.when)
            ret.whenArray = o.when.map(s => When.fromString(s));

        if(undefined != o['gx:coord'])
            ret.gxCoordArray = o['gx:coord'].map(s => GxCoord.fromString(s));
        return ret;
    }
}

class GxMultiTrack
{
    // GPGGA记录中的高度是海平面高度。因此默认为absolute
    constructor(altitudeMode, gxTracks = [])
    {
        this.altitudeMode = altitudeMode;
        this.gxTracks = gxTracks; // GxTrack对象，要求每个Track构造时传入altitudeMode=undefined
    }

    toObject()
    {
        return {
            'altitudeMode':this.altitudeMode,
            'gx:interpolate': 0,
            'gx:Track': toObjects(this.gxTracks)
        }
    }

    static fromObject(o)
    {
        let ret = new GxMultiTrack;
        ret.altitudeMode = o.altitudeMode;
        if(undefined != o['gx:Track'])
            ret.gxTracks = o['gx:Track'].map(o => GxTrack.fromObject(o));
        return ret;
    }
}

class LineString
{
    constructor(coordinates)
    {
        this.coordinates = coordinates; // Coordinate对象数组
    }

    toObject()
    {
        const coordinateStrs = toStrings(this.coordinates);
        return {
            'tessellate': 1,
            'coordinates': coordinateStrs.join(' ')
        };
    }

    static fromObject(o)
    {
        const coordinateText = o['coordinates'];
        if(undefined != coordinateText){
            const coordinates = coordinateText.split(' ').map(s => Coordinate.fromString(s));
            return new LineString(coordinates);
        }
        return undefined;
    }
}

class Folder
{
    constructor(name, placeMarks = [])
    {
        this.name = name;
        this.placeMarks = placeMarks; // PlaceMark对象数组
    }

    toObject()
    {
        return {
            'name' : this.name,
            'Placemark' : toObjects(this.placeMarks)
        };
    }

    static fromObject(o)
    {
        let ret = new Folder;
        ret.name = o.name;
        if(undefined != o.Placemark)
            ret.placeMarks = o.Placemark.map(o => PlaceMark.fromObject(o));
        return ret;
    }
}
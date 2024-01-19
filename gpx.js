"use strict"

export {
   Document,
   Wpt,
   Rte,
   Rtept,
   Trk,
   Trkseg,
   Trkpt
};

import * as DF from './date-format.js';
import * as FXP from './js/fxp.min.js';

const toObjects = (arr) => arr.map( c => c.toObject());

// 需要特殊处理xml转出来的数组（个数为1时很特别，因此要始终看作数组）
const AlwaysArray = ['trk','trkseg','trkpt', 'wpt', 'rte', 'rtept'];

const XMLParserOptions={
    ignoreAttributes: false,
    parseAttributeValue: true,
    attributeNamePrefix: "@",
    isArray: (name, jpath, isLeafNode, isAttribute) => {
        if(isAttribute)
            return false;
        return AlwaysArray.indexOf(name) !== -1;
    }
};

class Document
{
    constructor(name)
    {
        this.name = name;
        this.trks = []; // Trk
        this.rtes = []; // Rte
        this.wpts = []; // Wpt
    }

    toFile(beautify = false)
    {
        const gpxJson = {
            '?xml':{
                '@version':'1.0',
                '@encoding':'UTF-8'
            },
            'gpx':{
                '@version':'1.1',
                '@xmlns:xsi': 'http://www.w3.org/2001/XMLSchema-instance',
                '@xmlns': 'http://www.topografix.com/GPX/1/1',
                '@xsi:schemaLocation': 'http://www.topografix.com/GPX/1/1 http://www.topografix.com/GPX/1/1/gpx.xsd',
                'name':this.name,
                'wpt':toObjects(this.wpts),
                'rte':toObjects(this.rtes),
                'trk':toObjects(this.trks)
            }
        }

        const builder = new FXP.fxp.XMLBuilder(Object.assign(XMLParserOptions, {'format':beautify}));
        return builder.build(gpxJson);
    }

    static fromFile(content)
    {
        const parser = new FXP.fxp.XMLParser(XMLParserOptions);
        const gpxJson = parser.parse(content);
        if(gpxJson){
            let ret = new Document(undefined);
            let docJson = gpxJson.gpx;
            ret.name = docJson.name;

            if(undefined != docJson.wpt)
                ret.wpts = docJson.wpt.map(o => Wpt.fromObject(o));

            if(undefined != docJson.rte)
                ret.rtes = docJson.rte.map(o => Rte.fromObject(o));

            if(undefined != docJson.trk)
                ret.trks = docJson.trk.map(o => Trk.fromObject(o));

            return ret;
        }
        return undefined;
    }
}

class Wpt
{
    constructor(name, lat, lon, altitude=undefined, timestamp=undefined)
    {
        this.name = name;
        this.lat = lat;
        this.lon = lon;
        this.altitude = altitude;
        this.timestamp=timestamp;
    }

    toObject()
    {
        return {
            'name':this.name,
            '@lat':this.lat,
            '@lon':this.lon,
            'ele':this.altitude,
            'time':(undefined == this.timestamp? undefined: DF.toRfc3339(this.timestamp))
        };
    }

    static fromObject(o)
    {
        let t = undefined;
        if(undefined != o.time)
            t = DF.fromRfc3339(o.time);

        return new Wpt(o.name, o['@lat'], o['@lon'], o.ele, t);
    }
}

class Rte
{
    constructor(name, rtepts = [])
    {
        this.name = name;
        this.rtepts = rtepts;
    }

    toObject()
    {
        return {
            'name':this.name,
            'rtept': toObjects(this.rtepts)
        };
    }

    static fromObject(o)
    {
        let ret = new Rte(o.name);
        if(undefined != o.rtept)
            ret.rtepts = o.rtept.map(o => Rtept.fromObject(o));

        return ret;
    }
}

class Rtept
{
    constructor(lat, lon)
    {
        this.lat = lat;
        this.lon = lon;
    }

    toObject()
    {
        return {
            '@lat':this.lat,
            '@lon':this.lon
        };
    }

    static fromObject(o)
    {
        return new Rtept(o['@lat'], o['@lon']);
    }
}

class Trk
{
    constructor(name, trksegs = [])
    {
        this.name = name;
        this.trksegs = trksegs;
    }

    toObject()
    {
        return {
            'name': this.name,
            'trkseg' :toObjects(this.trksegs)
        };
    }

    static fromObject(o)
    {
        let ret = new Trk(o.name);
        if(undefined != o.trkseg)
            ret.trksegs = o.trkseg.map(o => Trkseg.fromObject(o));

        return ret;
    }
}

class Trkseg
{
    constructor(trkpts = [])
    {
        this.trkpts = trkpts;
    }

    toObject()
    {
        return {
            'trkpt' : toObjects(this.trkpts)
        };
    }

    static fromObject(o)
    {
        let ret = new Trkseg;
        if(undefined != o.trkpt)
            ret.trkpts = o.trkpt.map(o => Trkpt.fromObject(o));
        return ret;
    }
}

class Trkpt
{
    constructor(lat, lon, timestamp, altitude = undefined)
    {
        this.lat = lat;
        this.lon = lon;
        this.altitude = altitude;
        this.timestamp = timestamp;
    }

    toObject()
    {
        return {
            '@lat':this.lat,
            '@lon':this.lon,
            'time':DF.toRfc3339(this.timestamp),
            'ele':this.altitude
        };
    }

    static fromObject(o)
    {
        let t = 0;
        if(undefined != o.time)
            t = DF.fromRfc3339(o.time);

        return new Trkpt(o['@lat'], o['@lon'], t, o.ele);
    }
}

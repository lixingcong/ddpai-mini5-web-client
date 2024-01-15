"use strict"

import * as GPX from '../gpx.js';
import * as TEST_COMMON from './test-common.js';

let body = '';

// wp
body += GPX.wpt(3.6830779744, 110.2729520458, 12, 7, 'Point');

// trk
body += GPX.trkHead('Track 01');
body += GPX.trkpt(3.6830779744, 110.2729520458, 12, 7, '2001-06-02T03:26:55Z');
body += GPX.trkpt(3.6930779744, 110.2739520458, 12, 7, '2001-06-02T03:26:56Z');
body += GPX.trkpt(3.7030779744, 110.2749520458, 12, 7, '2001-06-02T03:26:57Z');
body += GPX.trkpt(3.7130779744, 110.2759520458, 12, 7, '2001-06-02T03:26:58Z');
body += GPX.trkpt(3.7230779744, 110.2769520458, 12, 7, '2001-06-02T03:26:59Z');
body += GPX.trkpt(3.7330779744, 110.2779520458, 12, 7, '2001-06-02T03:27:00Z');
body += GPX.trkpt(3.7430779744, 110.2789520458, 12, 7, '2001-06-02T03:27:01Z');
body += GPX.trkpt(3.7530779744, 110.2799520458, 12, 7, '2001-06-02T03:27:02Z');
body += GPX.trkTail();

// rte
body += GPX.rteHead('Line 01');
body += GPX.rtept(3.6830779744, 110.2729520458, 12);
body += GPX.rtept(3.6930779744, 110.2739520458, 12);
body += GPX.rtept(3.7030779744, 110.2749520458, 12);
body += GPX.rtept(3.7130779744, 110.2759520458, 12);
body += GPX.rtept(3.7230779744, 110.2769520458, 12);
body += GPX.rtept(3.7330779744, 110.2779520458, 12);
body += GPX.rtept(3.7430779744, 110.2789520458, 12);
body += GPX.rtept(3.7530779744, 110.2799520458, 12);
body += GPX.rteTail();

// final result
const gpxFileContent = GPX.head('Hello') + body + GPX.tail();

TEST_COMMON.writeFile('/tmp/0000000.gpx', gpxFileContent);
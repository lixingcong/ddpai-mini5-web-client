// global vars
// var serverHostUrl = 'http://193.168.0.1';
var serverHostUrl = 'http://files.local';
var urlAPIGpsFileListReq = serverHostUrl + '/cmd.cgi?cmd=API_GpsFileListReq';

// params
var serverAjaxTimeout = 3000;
var cookieKey='SessionID';

const sessionIdFromCookie=()=>{
    let c=document.cookie;
    if(c && c.startsWith(cookieKey)){
        let cs=c.split('=');
        if(cs.length>0)
            return cs[1];
    }
    return '';
}

const textToJson=(text)=>{
    let t=text.replaceAll('\\"','"').replaceAll('"{','{').replaceAll('}"','}');
    return JSON.parse(t);
}

// promise 1
function promiseHttpAjax(url, method, withCredentials=false, body=null) {
	// API: resolve(response) reject(httpCode)
	return new Promise(function (resolve, reject) {
		let xhr = new XMLHttpRequest();
		xhr.open(method, url, true);
        xhr.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
        if(withCredentials){
            xhr.withCredentials=true;
            let sessionId=sessionIdFromCookie();
            if(sessionId!=='')
                xhr.setRequestHeader('sessionid', sessionId);
        }
        xhr.timeout=serverAjaxTimeout;
		xhr.send(body);
		xhr.onreadystatechange = function () {
			if (this.readyState === 4) {
				if (this.status === 200)
					resolve(this.response);
				else
					reject(new Error('(' + xhr.status + ') ' + url));
			}
		}
	});
}

function promiseObtainSessionId()
{
    let url=serverHostUrl+'/cmd.cgi?cmd=API_RequestSessionID';
    return promiseHttpAjax(url, 'POST', false).then(
        (response)=>{
            let j=textToJson(response);
            if(j && j.errcode===0){
                document.cookie=cookieKey+'='+j.data.acSessionId;
                return true;
            }
            return Promise.reject();
        }
    );
}

function promiseRequestCertificate()
{
    let url=serverHostUrl+'/cmd.cgi?cmd=API_RequestCertificate';
    let body='{"user":"admin","password":"admin","level":0,"uid":"6b4014501d19a893"}';
    return promiseHttpAjax(url, 'POST', true, body).then(
        (response)=>{
            console.log(response);
            let j=textToJson(response);
            if(j && j.errcode===0)
                return true;
            return Promise.reject();
        }
    );
}

// promise 2

const test= async ()=>{
    promiseObtainSessionId().then(()=>{
        return promiseRequestCertificate();
    }).then(()=>{
        console.log('ok');
    });
}

test();
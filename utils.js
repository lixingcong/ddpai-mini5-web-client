"use strict"

export {
    meterToString,
    intWidth,
    scaleToIndex,
    secondToHumanReadableString,
    millisecondToHumanReadableString,
    byteToHumanReadableSize,
    isObjectEmpty,
    zeroPad,
	splitOrderedNumbersByThreshold
};

// 将数字（单位：米）转成字符串
function meterToString(meter) {
	if (meter > 1000)
		return (meter / 1000).toFixed(1) + 'km';
	return Math.trunc(meter) + 'm';
}

// 返回十进制整数的数字位数，如123返回3
function intWidth(num){
    let ret = 0;
    do{
        num = Math.trunc(num / 10);
        ++ret;
    } while(num > 0);
    return ret;
}

/**
 * 转成指数刻度
 *
 * @param {number} inputVal 输入值
 * @param {number} inputMinVal 输入值最小值，若输入值等于此值，会返回0
 * @param {number} inputMaxVal 输入值最大值，若输入值等于此值，会返回1
 * @param {number} base 指数的基，如Math.E
 * @param {number} baseMinX 图像最左侧的X，必须为正数。指数函数中取[-baseMiX, 0]这一段图像作为刻度
 * @returns {array} 返回值的范围[0,1]
 */
function scaleToIndex(inputVal, inputMinVal, inputMaxVal, base, baseMinX) {
	if (inputVal <= inputMinVal)
		return 0;
	if (inputVal >= inputMaxVal)
		return 1;

	inputVal -= inputMinVal; // 移到0
	inputVal /= (inputMaxVal - inputMinVal); // [0,1]
	inputVal -= 1; // [-1,0]
	inputVal *= baseMinX; // [baseMinX,0]
	return Math.pow(base, inputVal);
}

// 秒转为'XX分'或者'XX时'
function secondToHumanReadableString(second) {
	if (second < 60)
		return second + 's';
	if (second < 3600)
		return Math.trunc(second / 60) + 'm';
	if (second < 86400)
		return (second / 3600).toFixed(1) + 'h';
	return (second / 86400).toFixed(1) + 'd';
}

function millisecondToHumanReadableString(ms) {
    if (ms < 1000)
        return ms + 'ms';
    return secondToHumanReadableString(parseFloat((ms / 1000).toFixed(1)));
}

// 字节转为'KB'或者'MB'
function byteToHumanReadableSize(bytes) {
	const texts = ['B', 'K', 'M', 'G', 'T'];
	if (0 == bytes) return '0B';
	const level = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
    const num = bytes / Math.pow(1024, level);
    const decimal = bytes < 1024 ? 0 : 1;
	return num.toFixed(decimal) + texts[level];
}

function isObjectEmpty(obj){
	// https://stackoverflow.com/questions/679915/how-do-i-test-for-an-empty-javascript-object
	for(let i in obj)
		return false;
	return true;
}

// 给数字加上前缀0，返回字符串
function zeroPad(num, places) {
    // add leading zero to integer number
    var zero = places - num.toString().length + 1;
    return Array(+(zero > 0 && zero)).join("0") + num;
}

// 输入升序一维数组，输出按相邻元素的差值的阈值分割的二维数组
// 用于组合相近的timestamp为一个组
function splitOrderedNumbersByThreshold(numbers, threshold)
{
    if (threshold < 1)  // 小于1表示不分割
        return [numbers];

    let ret = [];
    let lastNumber = Number.MIN_SAFE_INTEGER;
    let lastGroup = undefined;

    numbers.forEach(number => {
        if (number - lastNumber > threshold) {
            lastGroup = new Array();
            ret.push(lastGroup);
        }
        lastGroup.push(number);
        lastNumber = number;
    });

    return ret;
};
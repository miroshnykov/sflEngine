let utils = {
    isString: x => typeof x === 'string',
    addHttp: url => cleanUpSpace(addHttpUrl(url)),
    isObject: obj => (isObj(obj)),
    isArr: arr => (isArrNotEmpty(arr)),
    hasOwn: (obj, key) => Object.prototype.hasOwnProperty.call(obj, key),
}

const cleanUpSpace = url => url.replace(/ /g, '')
const checkHttpOrHttps = url => /^(http|https):/i.test(url)
const addHttpUrl = url => checkHttpOrHttps(url) ? url : 'http://' + url

const isObj = obj => typeof obj === 'object' && isObjectNotEmpty(obj)

const isObjectNotEmpty = obj => Object.keys(obj).length
const isArrNotEmpty = arr => arr.length

module.exports = utils
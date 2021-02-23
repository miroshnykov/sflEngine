const config = require('plain-config')()
const fs = require('fs')
const xhash = require('xxhash')
const logger = require('bunyan-loader')(config.log).child({scope: 'utils.js'})

let utils = {
    isString: x => typeof x === 'string',
    addHttp: url => cleanUpSpace(addHttpUrl(url)),
    isObject: obj => (isObj(obj)),
    isArr: arr => (isArrNotEmpty(arr)),
    hasOwn: (obj, key) => Object.prototype.hasOwnProperty.call(obj, key),
    rangeSpeed: time => rangeSpeed(time),
    rangeTime: time => rangeTime(time),
    getFileSize: filename => getFileSize_(filename),
    getAffiliateHash: (hashSalt, affiliateId) => getAffiliateHash(hashSalt, affiliateId),
    proportionalDistributionsLP: (landingPages) => {

        if (landingPages.length === 0) {
            return config.redirectFlowRotator.url + '/signup'
        }
        let weightTotal = 0
        for (let i = 0; i < landingPages.length; i++) {
            weightTotal += landingPages[i].weight
        }

        for (let i = 0; i < landingPages.length; i++) {
            landingPages[i].index = i
            landingPages[i].distribution = landingPages[i].weight / weightTotal
        }

        return pickOne(landingPages)
    }
}

const getAffiliateHash = (hashSalt, affiliateId) => {
    let hash = new xhash(hashSalt)
    hash.update(new Buffer.from(affiliateId))
    return hash.digest() + ""
}

const getFileSize_ = (filename) => {
    try {
        let stats = fs.statSync(filename)
        return stats.size
    } catch (e) {
        logger.error('getFileSizeError:', e)
    }
}

const cleanUpSpace = url => url.replace(/ /g, '')
const checkHttpOrHttps = url => /^(http|https):/i.test(url)
const addHttpUrl = url => checkHttpOrHttps(url) ? url : 'http://' + url

const isObj = obj => typeof obj === 'object' && isObjectNotEmpty(obj)

const isObjectNotEmpty = obj => Object.keys(obj).length
const isArrNotEmpty = arr => arr.length

const pickOne = (pool) => {
    let key = 0
    let selector = Math.random()
    while (selector > 0) {
        selector -= pool[key].distribution
        key++
    }
    // Because the selector was decremented before key was
    // incremented we need to decrement the key to get the
    // element that actually exited the loop.
    key--

    return pool[key]
}


const rangeSpeed = (time) => {
    switch (true) {
        case time < 100 :
            return 100
        case  time > 101 && time < 200 :
            return 200
        case  time > 201 && time < 300 :
            return 300
        case  time > 301 && time < 400 :
            return 400
        case  time > 401 && time < 500 :
            return 500
        case  time > 501 && time < 600 :
            return 600
        case  time > 601 && time < 700 :
            return 700
        case  time > 701 && time < 800 :
            return 800
        case  time > 801 && time < 900 :
            return 900
        case  time > 901 && time < 1000 :
            return 1000
        case  time > 1001 && time < 1200 :
            return 1200
        case  time > 1201 && time < 1400 :
            return 1400
        case  time > 1401 && time < 1600 :
            return 1600
        case  time > 1601 && time < 1800 :
            return 1800
        case  time > 1801 && time < 2000 :
            return 2000
        default:
            return 2500
    }
}

const rangeTime = (time) => {
    time = time.toFixed(1)
    switch (true) {
        case time < 0.1 :
            return 0.1
        case  time > 0.2 && time < 0.3 :
            return 0.3
        case  time > 0.4 && time < 0.5 :
            return 0.5
        case  time > 0.6 && time < 0.7 :
            return 0.6
        case  time > 0.8 && time < 1.0 :
            return 1
        case  time > 1.1 && time < 2.0 :
            return 2
        case  time > 2.0 && time < 3.0 :
            return 3
        case  time > 3.0 && time < 4.0 :
            return 4
        case  time > 4.0 && time < 5.0 :
            return 5
        case  time > 5.0 && time < 6.0 :
            return 6
        case  time > 6.0 && time < 7.0 :
            return 7
        case  time > 7.0 && time < 8.0 :
            return 8
        case  time > 8.0 && time < 9.0:
            return 9
        case  time > 9.0 && time < 10.0 :
            return 10
        case  time > 10.0 && time < 12.0 :
            return 12
        case  time > 12.1 && time < 14.0 :
            return 14
        case  time > 14.1 && time < 16.0 :
            return 16
        case  time > 16.1 && time < 20.0 :
            return 20
        case  time > 20.1 && time < 50.0 :
            return 50
        case  time > 50.1 && time < 100.0 :
            return 100
        case  time > 100.1 && time < 150.0 :
            return 150
        case  time > 150.1 && time < 200.0 :
            return 200
        case  time > 200.1 && time < 400.0 :
            return 400
        case  time > 400.1 && time < 600.0 :
            return 600
        default:
            return 700
    }
}

module.exports = utils
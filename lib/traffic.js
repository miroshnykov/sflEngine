const {hasOwn, addHttp, isObject} = require('./utils')
const {getDataCache} = require('../cache/redis')
const {getTargetingLocal} = require('../cache/local/targeting')
const config = require('plain-config')()
const logger = require('bunyan-loader')(config.log).child({scope: 'traffic.js'})

const {resolveIP} = require('./geo')
const {checkConditions} = require('./checkConditions')
const {getBudgetStatusByCampaign, addClick} = require('../cache/api/traffic')
const {v4} = require('uuid')
const deviceDetector = require('device-detector')
const url = require('url')

let traffic = {
    signup: async (req, res, next) => {
        try {
            // http://localhost:8088/signup?prod=650&ref=5204378&source_type=Sweepstakes&platform=Windows
            // http://flow-rotator-eu-west-1-titan-107.infra.systems/signup?ad_domain=look.udncoeln.com&ad_path=%2Foffer&prod=972&ref=5165998&sf=&adserver=1.3.7-with-key-update
            // http://localhost:8088/signup?ad_domain=look.udncoeln.com&ad_path=%2Foffer&prod=972&&prod=650&ref=5204378&source_type=Sweepstakes&platform=Windows
            // let targeting = []
            let targeting = await getTargetingLocal() || []

            let originalUrl = req.originalUrl
            // let conditions = await getConditions()
            let response = {}
            response.targeting = targeting

            let params = getParams(req)

            let findUnderLimit = targeting.filter(item => (item.budgetTotal > item.spentTotal && item.budgetDaily > item.spentDaily))

            response.findUnderLimit = findUnderLimit
            let dimensions = getDimensions(params)
            let find = await checkConditions(findUnderLimit, dimensions)
            response.dimensions = dimensions
            response.finalFind = find

            if (find.length === 0) {
                response.redirectFR = '!!!!!!!!!!!!!!! STOP TRAFFIC  REDIRECT TO FR  !!!!!!!!!!!!!!!!!!!!!!!!'
                response.originalUrl = originalUrl
                response.FR = redirectUrlToFR(req, res, params.query)
                res.send(response)
                return
            }

            let spentClick = await getBudgetStatusByCampaign(find[0].campaignId)
            let budgetDaily = Number(find[0].budgetDaily)
            let budgetTotal = Number(find[0].budgetTotal)
            let dailySpentCalculate = Number(find[0].campaignCpc) * Number(spentClick.dailySpent)
            let totalSpentCalculate = Number(find[0].campaignCpc) * Number(spentClick.totalSpent)

            response.spentTrafficClick = spentClick
            response.budgetDaily = budgetDaily
            response.dailySpentCalculate = dailySpentCalculate
            response.budgetTotal = budgetTotal
            response.totalSpentCalculate = totalSpentCalculate

            if (dailySpentCalculate > budgetDaily || totalSpentCalculate > budgetTotal) {
                response.stopTraffic = ' !!!!!!!!!!!!!!! STOP TRAFFIC  REDIRECT TO FR  !!!!!!!!!!!!!!!!!!!!!!!!'
                response.FR = redirectUrlToFR(req, res, params.query)

            } else {
                let lid = v4()
                params.lid = lid
                params.landingPage = find[0].landing_page
                let lidObj = generateLid(req, dimensions, params)
                response.lidObj = lidObj
                addClick(find[0].campaignId, 1)
                response.redirectToLP = redirectUrl(req, res, params)
            }

            res.send(response)

            // redirectUrl(req, res, params)

        } catch (e) {

            next(e)
        }
    }
}

const getParams = (req) => {

    let geoObj = resolveIP(req)

    let query = req.query

    let params = {}
    let deviceInfo = deviceDetector.parse(req.headers['user-agent'])
    params.deviceType = deviceInfo.type
    params.browser = deviceInfo.browser
    params.browserEngine = deviceInfo.engine
    params.browserVersion = deviceInfo.version
    params.os = deviceInfo.os
    params.country = geoObj.country
    params.region = geoObj.region
    params.prod = query.prod || ''
    params.ref = query.ref || ''

    if (query.source_type) {
        params[`sourceType${ucfirst(query.source_type)}`] = query.source_type && true || false
    }
    if (query.platform) {
        params[`platform${ucfirst(query.platform)}`] = query.platform && true || false
    }

    params.query = query
    return params
}

const getDimensions = (params) => {
    let dimensions = {}
    let keys = Object.keys(params)
    keys.forEach(key => {
        if (config.dimensionsNames.includes(key)) {
            dimensions[key] = params[key]
        }
    })
    config.dimensionsNames.forEach(key => {
        if (!dimensions[key]) {
            dimensions[key] = false
        }
    })
    return dimensions
}

const ucfirst = (str) => {
    let firstLetter = str.slice(0, 1)
    return firstLetter.toUpperCase() + str.substring(1)
}

const getConditions = async () => {
    return await getDataCache(`targeting`)
}

const redirectUrl = (req, res, params) => {

    // params.landingPage = params.url ? addHttp(params.url) : config.default.landingPageUrl
    let originUrl = params.landingPage
    let urlToRedirect = originUrl + url.format({
        query: {
            'ad_domain': params.ad_domain || '',
            'ad_path': params.ad_path || '',
            'prod': params.prod || '',
            'ref': params.ref || '',
            'sf': params.sf || '',
            'adserver': params.adserver || '',
            'lid': params.lid || '',
        }
    })
    params.urlToRedirect = urlToRedirect
    // console.log(` \nUrlToRedirect: ${urlToRedirect} \nLID: ${params.lid}`)
    return urlToRedirect
    //res.send(urlToRedirect)
    //return

    // params.debuggerOn ? debugging(res, req, params) : res.redirect(urlToRedirect)

}

const redirectUrlToFR = (req, res, params) => {

    // params.landingPage = params.url ? addHttp(params.url) : config.default.landingPageUrl
    let originUrl = config.redirectFlowRotator.url
    let urlToRedirect = originUrl + url.format({
        query: {
            'ad_domain': params.ad_domain || '',
            'ad_path': params.ad_path || '',
            'prod': params.prod || '',
            'ref': params.ref || '',
            'sf': params.sf || '',
            'adserver': params.adserver || '',
        }
    })
    params.urlToRedirect = urlToRedirect
    // console.log(` \nUrlToRedirect: ${urlToRedirect} \nLID: ${params.lid}`)
    return urlToRedirect
    //res.send(urlToRedirect)
    //return

    // params.debuggerOn ? debugging(res, req, params) : res.redirect(urlToRedirect)

}

const generateLid = (req, dimensions, params) => (

    {
        'lid': params.lid || null,
        'adDomain': req.headers.host || null,
        'adPath': req.originalUrl || null,
        'device': params.deviceType || null,
        'domain': req.query.ad_domain || null,
        'countryCode': params.countryCode,
        'region': params.region,
        'sflServer': req.headers.host,
        'spid': req.query.spid || null,
        'userAgent': req.headers['user-agent'] || null,
        'browser': params.browser || null,
        'browserEngine': params.browserEngine || null,
        'browserVersion': params.browserVersion || null,
        'landingPage': params.landingPage || null,
        'os': params.os || null,
        'productId': req.query.prod && (parseInt(params.prod) !== 0) && req.query.prod || 0,
        'ref': req.query.ref || 0,
        'refererDomain': req.headers.referrer || req.headers.referer || req.query.referrer || req.query.referer || null,
        'refererPath': req.headers['referer'],
        'searchEngine': req.params.q || req.query.q || null,
        'searchKeyword': req.params.q || req.query.q || null,
        'country': dimensions.country,
        'sourceTypeSweepstakes': dimensions.sourceTypeSweepstakes,
        'sourceTypeVod': dimensions.sourceTypeVod,
        'platformWindows': dimensions.platformWindows,
        'platformAndroid': dimensions.platformAndroid,
        'platformIos': dimensions.platformIos
    }
)

const debugging = (res, req, params) => {
    res.setHeader('Content-Type', 'application/json')
    // let stackDebug = stackInit(params.debuggerOn)
    //
    // res.send({
    //     params: 'all data',
    //     info: params,
    //     segmentsResolving: stackDebug().getSegmentDebugStack()
    // })
}

module.exports = traffic
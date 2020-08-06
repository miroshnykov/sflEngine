const {hasOwn, addHttp, isObject} = require('./utils')
const {getDataCache} = require('../cache/redis')
const {getTargetingLocal} = require('../cache/local/targeting')
const config = require('plain-config')()
const logger = require('bunyan-loader')(config.log).child({scope: 'traffic.js'})

const {resolveIP} = require('./geo')
const {createLid} = require('./dynamoDb')
const {checkConditions} = require('./checkConditions')
const {getBudgetStatusByCampaign, addClick, getConditionUnderLimit} = require('../cache/api/traffic')
const {v4} = require('uuid')
const deviceDetector = require('device-detector')
const url = require('url')

const metrics = require('../metrics')

let traffic = {
    signup: async (req, res, next) => {
        try {
            // http://localhost:8088/signup?prod=650&ref=5204378&source_type=Sweepstakes&platform=Windows
            // http://flow-rotator-eu-west-1-titan-107.infra.systems/signup?ad_domain=look.udncoeln.com&ad_path=%2Foffer&prod=972&ref=5165998&sf=&adserver=1.3.7-with-key-update
            // http://localhost:8088/signup?ad_domain=look.udncoeln.com&ad_path=%2Foffer&prod=972&&prod=650&ref=5204378&source_type=Sweepstakes&platform=Windows

            // https://sfl-engin.surge.systems/signup?ad_domain=localhost%3A8084&ad_path=%2Foffer&prod=8&ref=5066372&adserver=adserving_nodejs

            let originalUrl = req.originalUrl
            let response = {}

            let params = getParams(req)

            let findUnderLimit = await getTargetingLocal() || []
            // let findUnderLimit = await getConditionUnderLimit()

            response.findUnderLimit = findUnderLimit
            let dimensions = getDimensions(params)
            let find = await checkConditions(findUnderLimit, dimensions)
            response.dimensions = dimensions
            response.finalFind = find

            if (find.length === 0) {
                metrics.setStartMetric({
                    route: 'FRLP',
                    method: 'GET'
                })
                let fr = config.redirectFlowRotator.url + originalUrl
                let redirectMessage = `FR URL: { ${fr} } `
                // console.log(redirectMessage)
                response.FR = redirectMessage
                console.log(` There no dimensions match,  redirect to FR, details: ${JSON.stringify(response)} \n`)
                // res.send(response)
                metrics.sendMetricsRequest(200)
                res.redirect(fr)
                return
            }


            params.lid = v4()
            params.landingPage = find[0].landing_page
            params.campaignId = find[0].campaignId
            params.targetingId = find[0].targetingId
            params.targetingCpc = find[0].targetingCpc
            let lidObj = generateLid(req, dimensions, params)
            response.lidObj = lidObj
            const {affiliate_id} = await createLid(lidObj)
            params.affiliate_id = affiliate_id
            let redirectToLP = redirectUrl(req, res, params)

            addClick(find[0].campaignId, 1, find[0].targetingCpc)
            let redirectToLPMessage = ` redirect to Landing page: { ${redirectToLP} } `
            response.redirectToLP = redirectToLPMessage
            // console.log(redirectToLPMessage)
            console.log(` Find matching dimensions, created LID { ${params.lid} }, details: ${JSON.stringify(response)} \n`)

            metrics.setStartMetric({
                route: 'SflLP',
                method: 'GET'
            })

            res.redirect(redirectToLP)
            // res.send(response)
            metrics.sendMetricsRequest(200)

        } catch (e) {
            metrics.sendMetricsRequest(500)
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

const replaceParams = (url, params) => {
    let defaultParams = ['affiliate_id', 'affiliate_type', 'lid']
    let reg = {}
    defaultParams.forEach((item) => {
        if (params[item]) {
            reg = new RegExp('\\[' + item + '\\]', 'gi')
            url = url.replace(reg, params[item]);
        }
    })

    return url
}

const redirectUrl = (req, res, params) => {

    let lp = params.landingPage.replace(/\s/g, '')
    let urlToRedirect = lp + url.format({
        query: {
            'ad_domain': params.query.ad_domain || '',
            'ad_path': params.query.ad_path || '',
            'prod': params.query.prod || '',
            'ref': params.query.ref || '',
            'sf': params.query.sf || '',
            'adserver': params.query.adserver || '',
            'platform': params.query.platform || '',
            'source_type': params.query.source_type || '',
            'lid': params.lid || '',
        }
    })
    urlToRedirect = reFormatUrl(urlToRedirect)

    let prefix = 'http'

    if (urlToRedirect.substr(0, prefix.length) !== prefix) {
        urlToRedirect = prefix + '://' + urlToRedirect
    }
    let urlToRedirectReplace = replaceParams(urlToRedirect, params)

    console.log(`UrlToRedirectReplace:${urlToRedirectReplace}`)
    params.urlToRedirect = urlToRedirectReplace
    return urlToRedirectReplace
}

const reFormatUrl = (urlToRedirect) => {

    let count = 0
    let foundCharactersPos = []
    for (let i = 0; i < urlToRedirect.length; i++) {

        if (urlToRedirect[i] === '?') {
            count++
            if (count >= 2) {
                foundCharactersPos.push(i)
            }
        }
    }

    for (let i = 0; i < foundCharactersPos.length; i++) {
        urlToRedirect = replaceAt(urlToRedirect, foundCharactersPos[i], '&')
    }
    return urlToRedirect
}

const replaceAt = (string, index, replace) => {
    return string.substr(0, index) + replace + string.substr(index + 1);
}

const generateLid = (req, dimensions, params) => (

    {
        'lid': params.lid || null,
        'adDomain': req.headers.host || null,
        'adPath': req.originalUrl || null,
        'device': params.deviceType || null,
        'domain': req.query.ad_domain || null,
        'countryCode': params.countryCode,
        'campaignId': params.campaignId || null,
        'targetingId': params.targetingId || null,
        'targetingCpc': params.targetingCpc || null,
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
        'platformIos': dimensions.platformIos,
        'event_type': 'click',
        '_messageType': 'aggregatorStatSfl',
        'product_id': req.query.prod && (parseInt(params.prod) !== 0) && req.query.prod || 0
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
const {hasOwn, addHttp, isObject} = require('./utils')
const {getDataCache} = require('../cache/redis')
const {targetingConditions} = require('../cache/targeting')
const config = require('plain-config')()
const logger = require('bunyan-loader')(config.log).child({scope: 'traffic.js'})

const {resolveIP} = require('./geo')
const {checkConditions} = require('./checkConditions')
const deviceDetector = require('device-detector')
const url = require('url')

let traffic = {
    signup: async (req, res, next) => {
        try {
            // http://localhost:8088/signup?prod=650&ref=5204378&source_type=Sweepstakes&platform=Windows
            // http://flow-rotator-eu-west-1-titan-107.infra.systems/signup?ad_domain=look.udncoeln.com&ad_path=%2Foffer&prod=972&ref=5165998&sf=&adserver=1.3.7-with-key-update
            // let targeting = []
            let targeting = await targetingConditions() || []

            let originalUrl = req.originalUrl
            // let conditions = await getConditions()
            let geoObj = resolveIP(req)
            let response = {}
            response.targeting = targeting
            // response.geoObj = geoObj
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
                // params.source_type = query.source_type || ''
                params[`sourceType${ucfirst(query.source_type)}`] = query.source_type && true || false
            }
            if (query.platform) {
                // params.platform = query.platform || ''
                params[`platform${ucfirst(query.platform)}`] = query.platform && true || false
            }

            params.query = query

            // console.log('deviceInfo.os:',params)
            response.params = params
            let dimensions = {}

            let keys = Object.keys(params)

            keys.forEach(key => {
                if (config.dimensionsNames.includes(key)) {
                    dimensions[key] = params[key]
                }
            })

            console.log(dimensions)

            // if (params.platformWindows)
            let find = await checkConditions(targeting, dimensions)
            response.dimensions = dimensions
            response.find = find


            if (find.length === 0) {
                response.redirectFR = 'yes'
                response.originalUrl = originalUrl

                let url = redirectUrl(req, res, params.query)
                response.FR = url
                console.log('URL:',url)
            } else {
                response.redirectToLP = find[0].landing_page
            }

            res.send(response)

            // redirectUrl(req, res, params)

        } catch (e) {

            next(e)
        }
    }
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

const generateLid = (req, res, params) => (

    {
        'lid': params.lidConcordGenerate || null,
        'vid': params.vid || null,
        'adDomain': req.headers.host || null,
        'adPath': req.originalUrl || null,
        'device': params.deviceType || null,
        'domain': req.query.ad_domain || null,
        'countryCode': params.countryCode,
        'region': params.region,
        'concordSegment': params.segmentIdResolve,
        'concordServer': req.headers.host,
        'concordVersion': params.concordVersion || null,
        'spid': req.query.spid || null,
        'userAgent': req.headers['user-agent'] || null,
        'browser': params.browser || null,
        'browserEngine': params.browserEngine || null,
        'browserVersion': params.browserVersion || null,
        'landingPage': params.landingPage || null,
        'os': params.os || null,
        'productId': req.query.prod && (parseInt(params.prod) !== 0) && req.query.prod || config.default.productId,
        'ref': req.query.ref || config.default.refCodeId,
        'refererDomain': req.headers.referrer || req.headers.referer || req.query.referrer || req.query.referer || null,
        'refererPath': req.headers['referer'],
        'searchEngine': req.params.q || req.query.q || null,
        'searchKeyword': req.params.q || req.query.q || null
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
const deviceDetector = require('device-detector')
const {resolveIP} = require('./offers/geo')
const config = require('plain-config')()
const metrics = require('../metrics')
const {getRefCodeInfo} = require('../api/refCode')
const {osCode, affiliateTypeCode, affiliateStatusCode} = require('../lib/utils')

const {
    getAffiliatesByIdEvent
} = require('../cache/localCache')

const {getDataCache} = require('../cache/redis')

const getParams = async (req) => {

    // let startTime = new Date()
    // let endTime

    let geoObj = resolveIP(req)

    let query = req.query

    let params = {}
    let deviceInfo = deviceDetector.parse(req.headers['user-agent'])
    params.deviceType = deviceInfo.type
    params.browser = deviceInfo.browser
    params.browserEngine = deviceInfo.engine
    params.browserVersion = deviceInfo.version
    params.os = deviceInfo.os
    params.osOrigin = deviceInfo.os
    params.country = geoObj.country
    params.geo = geoObj.country
    params.region = geoObj.region
    params.prod = query.prod || ''
    params.product_id = query.prod || ''
    params.media_type = query.media_type || ''
    params.sub_type = query.sub_type || ''
    params.sub_campaign = query.sub_id || ''
    params.custom_audience = query.custom_audience || ''
    params.ref = query.ref || ''
    params.debugging = query.debugging || ''

    // let productsBuckets = await getProductsBucketsLocal() || []
    // console.log(productsBuckets)

    // let findSourceType = productsBuckets.filter(item => (item.productId === Number(params.prod)))
    let findSourceType = config.productsBucketsList.filter(item => (item.productId === Number(params.prod)))

    if (findSourceType.length !== 0) {
        // console.log(`\nFindSourceType:${JSON.stringify(findSourceType)}`)
        query.source_type = findSourceType[0].sourceType
    }

    if (deviceInfo.os) {
        query.platform = detectingOs(deviceInfo.os)
        params.platform = detectingOs(deviceInfo.os)
    }
    // const hostname = os.hostname()

    // metrics.influxdb(200, `country-${geoObj.country}`)

    if (query.source_type) {
        params[`sourceType${ucfirst(query.source_type)}`] = query.source_type && true || false
        // metrics.influxdb(200, `sourceType-${query.source_type}`)
    }
    if (query.platform) {
        params[`platform${ucfirst(query.platform)}`] = query.platform && true || false
        // metrics.influxdb(200, `platform-${query.platform}`)
    }

    params.query = query


    params.response = {}
    params.originalUrl = req.originalUrl
    // params.startTime = startTime
    // params.endTime = endTime
    let refInfo = await getRefCodeInfo(req.query.ref) || 0

    let dimensions = getDimensions(params)
    params.refInfo = refInfo
    let affiliateId = refInfo && refInfo.affiliate_id || 0
    let campaignId = refInfo && refInfo.campaign_id || 0
    let programId = refInfo && refInfo.program_id || 0

    let affInfo = await getAffiliatesByIdEvent(affiliateId)
    if (!affInfo) {
        // metrics.influxdb(500, `affiliateLocalCacheEmpty`)
        affInfo = await getDataCache(`affiliate-${affiliateId}`)
        if (!affInfo) {
            console.log(`RedisEmptyAffiliateId-${affiliateId}`)
            metrics.influxdb(500, `affiliateRedisCacheEmpty`)
        }
    }

    params.affInfo = affInfo
    params.affiliate = affiliateId
    params.affiliateId = affiliateId
    params.affiliate_id = affiliateId
    params.dimensions = dimensions
    params.campaignId = campaignId
    params.programId = programId
    params.affiliate_country = `${affiliateId}/${params.country}`
    params.affiliate_campaign = `${affiliateId}/${campaignId}`
    params.os = osCode(params.platform)

    params.affiliateTypeOrigin = affInfo && affInfo.affiliateType
    params.affiliate_type = affiliateTypeCode(affInfo && affInfo.affiliateType)

    params.affiliateStatusOrigin = affInfo && affInfo.status
    params.affiliate_status = affiliateStatusCode(affInfo && affInfo.status)

    params.prod = params.query.prod

    return params
}


const getOfferParams = async (req) => {

    let startTime = new Date()
    let endTime


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
    params.geo = geoObj.country
    params.region = geoObj.region
    params.prod = query.prod || ''
    params.ref = query.ref || ''
    params.debugging = query.debugging || ''
    params.offerId = req.query.offer
    params.startTime = startTime
    params.endTime = endTime

    if (deviceInfo.os) {
        params.platform = detectingOs(deviceInfo.os)
    }

    params.query = query

    params.response = {}
    params.originalUrl = req.originalUrl

    return params
}

const detectingOs = (osNameOrigin) => {
    let osName
    if (checkOs(osNameOrigin, 'win') !== -1) osName = 'Windows'
    if (checkOs(osNameOrigin, 'mac') !== -1
        || checkOs(osNameOrigin, 'ios') !== -1
        || checkOs(osNameOrigin, 'iphone') !== -1
        || checkOs(osNameOrigin, 'ipad') !== -1
        || checkOs(osNameOrigin, 'ipod') !== -1
    ) osName = 'Ios'
    if (checkOs(osNameOrigin, 'android') !== -1) osName = 'Android'
    if (checkOs(osNameOrigin, 'linux') !== -1) osName = 'Linux'
    if (checkOs(osNameOrigin, 'symbianos') !== -1) osName = 'WindowsMobile'

    return osName

}

const checkOs = (osNameOrigin, os) => (osNameOrigin.toLocaleLowerCase().indexOf(os))

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

module.exports = {
    getParams,
    getOfferParams,
    getDimensions
}

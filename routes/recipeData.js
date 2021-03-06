const {getData} = require('../cache/local/offers')
const config = require('plain-config')()
const os = require('os')
const {catchHandler} = require('../middlewares/catchErr')
const {
    getBlockSegmentsEvent,
    getStandardSegmentsEvent,
    getTargetingEvent,
    getLandingPagesEvent,
    getRandomSitesEvent,
    getAdvertisersByProdIdEvent,
} = require('../cache/localCache')
const logger = require('bunyan-loader')(config.log).child({scope: 'recipeData.js'})
const {getDataCache} = require('../cache/redis')

const {
    pickRandomSites
} = require('../lib/utils')

const {
    getAffiliatesEvent,
    getAffiliatesWebsitesEvent,
    getAffiliatesWebsitesByIdEvent
} = require('../cache/localCache')

// http://localhost:8088/getRecipeData?offerId=2&debugging=debugging
// http://localhost:8088/getRecipeData?affilaitesWebsitesLocal=affilaitesWebsitesLocal&debugging=debugging
// http://localhost:8088/getRecipeData?affilaitesWebsitesLocalById=3721&debugging=debugging
// http://localhost:8088/getRecipeData?campaignId=2
// http://localhost:8088/getRecipeData?segments=segments&debugging=debugging
// http://localhost:8088/getRecipeData?segmentsCount=segmentsCount&debugging=debugging
// http://localhost:8088/getRecipeData?advertiserByProdId=1&debugging=debugging
// http://localhost:8088/getRecipeData?awsComplaintsRefCodesCache=awsComplaintsRefCodesCache&debugging=debugging

// https://sfl-engin-staging.surge.systems/getRecipeData?affilaitesWebsitesLocal=affilaitesWebsitesLocal&debugging=debugging
// https://sfl-engin-staging.surge.systems/getRecipeData?campaignId=86&debugging=debugging
// https://sfl-engin-staging.surge.systems/getRecipeData?offerId=35694&debugging=debugging
// https://sfl-engin-staging.surge.systems/getRecipeData?segments=segments&debugging=debugging
// https://sfl-engin-staging.surge.systems/getRecipeData?advertiserByProdId=1&debugging=debugging
// https://sfl-engin-staging.surge.systems/getRecipeData?affiliateId=181750&debugging=debugging


// https://sfl-engin.surge.systems/getRecipeData?affilaitesWebsitesLocal=affilaitesWebsitesLocal&debugging=debugging
// https://sfl-engin.surge.systems/getRecipeData?offerId=166&debugging=debugging
// https://sfl-engin.surge.systems/getRecipeData?affiliateId=181750&debugging=debugging
// https://sfl-engin.surge.systems/getRecipeData?campaignId=970500&debugging=debugging
// https://sfl-engin.surge.systems/getRecipeData?segments=segments&debugging=debugging
// https://engin.actio.systems/getRecipeData?offerId=6&debugging=debugging
// https://engin.actio.systems/getRecipeData?advertiserByProdId=1&debugging=debugging
// https://sfl-engin.surge.systems/getRecipeData?segmentsCount=segmentsCount&debugging=debugging

// https://sfl-engin.surge.systems/getRecipeData?affilaitesWebsitesLocal=affilaitesWebsitesLocal&debugging=debugging
// https://sfl-engin.surge.systems/getRecipeData?affilaitesWebsitesLocal=affilaitesWebsitesLocal&debugging=debugging
// https://sfl-engin.surge.systems/getRecipeData?awsComplaintsRefCodesCache=awsComplaintsRefCodesCache&debugging=debugging

let recipeData = {
    getRecipeData: async (req, res, next) => {
        try {
            let offerId = req.query.offerId
            let campaignId = req.query.campaignId
            let affiliateWebsites = req.query.affiliateWebsites
            let affilaitesWebsitesLocal = req.query.affilaitesWebsitesLocal
            let affilaitesWebsitesLocalById = req.query.affilaitesWebsitesLocalById
            let advertiserByProdId = req.query.advertiserByProdId
            let awsComplaintsRefCodesCache = req.query.awsComplaintsRefCodesCache
            let affiliateId = req.query.affiliateId
            let segments = req.query.segments
            let segmentsCount = req.query.segmentsCount
            let debugging = req.query.debugging
            // response.params = params
            // response.originalUrl = originalUrl
            let response = {}
            let sites = ['oneSIte', 'twoSite', '3site', '4Site']
            let site = sites[Math.floor(Math.random() * sites.length)]
            if (debugging !== 'debugging') {
                res.send(response)
                return
            }

            response.offerId = offerId || 0
            // response.site = site || 0
            response.campaignId = campaignId || 0
            response.affiliateWebsites = affiliateWebsites || 0
            response.affiliateId = affiliateId || 0

            if (offerId) {
                response.offerInfo = await getData(`offer-${offerId}`) || []
            }

            if (campaignId) {
                response.campaignInfo = await getData(`campaign-${campaignId}`) || []
            }
            if (affiliateWebsites) {
                response.affiliateWebsitesInfo = await getData(`affiliateWebsites-${affiliateWebsites}`) || []
            }
            if (affiliateId) {
                response.affiliate = await getData(`affiliate-${affiliateId}`) || []
            }

            if (segments) {
                let rs = await getData(`randomSitesInfo`) || []
                let randomSites = await getRandomSitesEvent()
                response.randomSite = pickRandomSites(randomSites)
                response.randomSiteCount = randomSites.length
                response.randomSiteCountRedis = rs.length

                response.segmentsBlockInfo = await getBlockSegmentsEvent()
                response.segmentsStandardInfo = await getStandardSegmentsEvent()
                response.targetingInfo = await getTargetingEvent()
                response.landingPages = await getLandingPagesEvent()
                response.blockedIp = await getData(`blockedIp_`) || []
                response.processPid = process.pid || 0
            }
            if (segmentsCount) {
                let segmentsBlockInfoCount = await getBlockSegmentsEvent()
                response.segmentsBlockInfoCount = segmentsBlockInfoCount.length || 0

                let segmentsStandardInfoCount = await getStandardSegmentsEvent()
                response.segmentsStandardInfoCount = segmentsStandardInfoCount.length || 0

                let landingPagesCount = await getLandingPagesEvent()
                response.landingPagesCount = landingPagesCount.length || 0
                let adv = await getAdvertisersByProdIdEvent()
                // let advitem = await getAdvertisersByProdIdEvent(440)
                response.advertisersCount = Object.keys(adv).length
                // response.advertisersadvitem = advitem


            }

            if (advertiserByProdId) {
                let advAll = await getAdvertisersByProdIdEvent()
                let adv = await getAdvertisersByProdIdEvent(advertiserByProdId)
                // let advitem = await getAdvertisersByProdIdEvent(440)
                response.advertisersCount = Object.keys(advAll).length
                response.advertisersById = adv
            }

            if (awsComplaintsRefCodesCache) {
                let awsComplaintsRefCodesCacheInfo = await getDataCache('awsComplaintsRefCodes_')
                response.awsComplaintsRefCodesCache = awsComplaintsRefCodesCacheInfo
            }

            if (affilaitesWebsitesLocal) {
                let affWebsites = await getAffiliatesWebsitesEvent()
                let affiliates = await getAffiliatesEvent()
                response.affilaitesWebsitesObjectCount = Object.keys(affWebsites).length
                response.affiliatesObjectCount = Object.keys(affiliates).length
            }
            if (affilaitesWebsitesLocalById) {
                response.affilaitesWebsitesLocalById = await getAffiliatesWebsitesByIdEvent(affilaitesWebsitesLocalById)
                response.affiliateWebsitesInfo = await getData(`affiliateWebsites-${affilaitesWebsitesLocalById}`) || []
            }

            const computerName = os.hostname()
            const freemem = os.freemem()
            // const userInfo = os.userInfo()
            // const release = os.release()
            response.computerName = computerName || 0
            response.freemem = freemem || 0

            res.send(response)

        } catch (e) {
            catchHandler(e, 'getRecipeDataErr')
            logger.error('getRecipeDataError:', e)
            next(e)
        }
    }
}

module.exports = recipeData
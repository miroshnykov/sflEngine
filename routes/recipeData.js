const {getData} = require('../cache/local/offers')
const config = require('plain-config')()
const os = require('os')
const {catchHandler} = require('../middlewares/catchErr')
const {
    getBlockSegmentsEvent,
    getStandardSegmentsEvent,
    getTargetingEvent,
    getLandingPagesEvent
} = require('../cache/localCache')

const {
    getAffiliatesWebsitesEvent,
    getAffiliatesWebsitesByIdEvent
} = require('../cache/localCache')

// http://localhost:8088/getRecipeData?offerId=2&debugging=debugging
// http://localhost:8088/getRecipeData?affilaitesWebsitesLocal=affilaitesWebsitesLocal&debugging=debugging
// http://localhost:8088/getRecipeData?affilaitesWebsitesLocalById=3721&debugging=debugging
// http://localhost:8088/getRecipeData?campaignId=2
// http://localhost:8088/getRecipeData?segments=segments&debugging=debugging

// https://sfl-engin-staging.surge.systems/getRecipeData?campaignId=86&debugging=debugging
// https://sfl-engin-staging.surge.systems/getRecipeData?offerId=6&debugging=debugging
// https://sfl-engin-staging.surge.systems/getRecipeData?segments=segments&debugging=debugging


// https://sfl-engin.surge.systems/getRecipeData?offerId=6&debugging=debugging
// https://sfl-engin.surge.systems/getRecipeData?campaignId=6&debugging=debugging
// https://engin.actio.systems/getRecipeData?offerId=6&debugging=debugging

let recipeData = {
    getRecipeData: async (req, res, next) => {
        try {
            let offerId = req.query.offerId
            let campaignId = req.query.campaignId
            let affiliateWebsites = req.query.affiliateWebsites
            let affilaitesWebsitesLocal = req.query.affilaitesWebsitesLocal
            let affilaitesWebsitesLocalById = req.query.affilaitesWebsitesLocalById
            let affiliateId = req.query.affiliateId
            let segments = req.query.segments
            let debugging = req.query.debugging
            // response.params = params
            // response.originalUrl = originalUrl
            let response = {}

            if (debugging !== 'debugging') {
                res.send(response)
                return
            }

            response.offerId = offerId || 0
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
                response.segmentsBlockInfo = await getBlockSegmentsEvent()
                response.segmentsStandardInfo = await getStandardSegmentsEvent()
                response.targetingInfo = await getTargetingEvent()
                response.landingPages = await getLandingPagesEvent()
                response.blockedIp = await getData(`blockedIp_`) || []
                response.processPid = process.pid || 0
            }
            if (affilaitesWebsitesLocal){
                let affWebsites = await getAffiliatesWebsitesEvent()
                response.affilaitesWebsitesObjectCount =  Object.keys(affWebsites).length
            }
            if (affilaitesWebsitesLocalById){
                response.affilaitesWebsitesLocalById =  await getAffiliatesWebsitesByIdEvent(affilaitesWebsitesLocalById)
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
            console.log('getRecipeDataError:', e)
            next(e)
        }
    }
}

module.exports = recipeData
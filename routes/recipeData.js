const {getData} = require('../cache/local/offers')
const config = require('plain-config')()
const os = require('os')
const {catchHandler} = require('../middlewares/catchErr')

let recipeData = {
    getRecipeData: async (req, res, next) => {
        try {
            // http://localhost:8088/getDataCache?offerId=2
            // http://localhost:8088/getDataCache?campaignId=2
            let offerId = req.query.offerId
            let campaignId = req.query.campaignId
            let affiliateWebsites = req.query.affiliateWebsites
            let affiliateId = req.query.affiliateId
            // response.params = params
            // response.originalUrl = originalUrl
            let response = {}
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

            const computerName = os.hostname()
            const freemem = os.freemem()
            // const userInfo = os.userInfo()
            // const release = os.release()
            response.computerName = computerName || 0
            response.freemem = freemem || 0
            // response.userInfo = userInfo || 0
            // response.release = release || 0

            res.send(response)

        } catch (e) {
            catchHandler(e, 'getRecipeDataErr')
            console.log('getRecipeDataError:', e)
            next(e)
        }
    }
}

module.exports = recipeData
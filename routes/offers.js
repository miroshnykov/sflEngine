const {getData} = require('../cache/local/offers')
const config = require('plain-config')()

const {createLidOffer} = require('../lib/dynamoDb')
const {geoRestrictions} = require('../lib/offers/geoRestrictions')
const {resolveRules} = require('../lib/offers/rulesResolve')
const {getOfferParams} = require('../lib/params')

const {v4} = require('uuid')
const metrics = require('../metrics')
const {decrypt} = require('../lib/offers/decrypt')
const {lidOffer} = require('../lib/lid')

const {catchHandler} = require('../middlewares/catchErr')

// offer id 1
// http://localhost:8088/ad?offer=415655028459403008171b3b20b12df8:fe6b8dd08c47a5d240747ecb28330b37e76ade3b203f8fb6fa166e1b573372348eb61217d27871856bc30306a57c07b2

// offer id 28 with cap
// http://localhost:8088/ad?offer=d6a5c6885f46299bdc3df7402eff9132:78c249392e405e8d5f747c7d1aadb118afce7de44de6078f7a0c3026b6ddbe41beee2da1aea5ae5c2cebe79af15fba73

// offer 6 stage
// https://sfl-engin-staging.surge.systems/ad?offer=29152edc3f320183afa799a07c16709c:5f52073798d7b90a8812f5b50673897848074900f0db47eb1ca65022b92dfc7bdb845e16d6b966c7fef63e33204bf025

let offers = {
    ad: async (req, res, next) => {
        try {

            let params = await getOfferParams(req)
            const debug = params.debugging === `debugging` && true || false

            let decodedOfferId = decrypt(params.offerId)
            params.response.decodedOfferId = decodedOfferId

            let decodedObj = parseJson(decodedOfferId)
            params.response.decodedObj = decodedObj

            let offerInfo = await getData(`offer-${decodedObj.offerId}`) || []
            params.response.offerInfo = offerInfo
            params.response.redirectUrl = offerInfo.landingPageUrl || ''

            if (offerInfo.capOverrideOfferId) {
                params.cap = '*************** capOverride ************* '
                params.landingPageIdOrigin = offerInfo.landingPageIdOrigin || 0
                params.capOverrideOfferId = offerInfo.capOverrideOfferId || 0
            }


            if (offerInfo.customLpRules) {
                params.response.customLpRulesExists = '*************** customLpRules ************* '
                let customLpRules = parseJson(offerInfo.customLpRules)
                params.response.customLpRules = customLpRules
                // console.log('resolveGeo:', resolveGeo)
                // console.log('\nGeoRules:',geoRules)
                // geoRules.geo.map(item=>{
                //     console.log(item)
                // } )

            } else {
                params.response.customLpRules = 'There is no customLpRules  set up'
            }

            if (offerInfo.geoOfferId) {
                let geoRules = parseJson(offerInfo.geoRules)
                params.response.geoRules = geoRules
                let resolveGeo = await geoRestrictions(params.country, geoRules.geo)
                params.response.resolveGeo = resolveGeo.length !== 0 && resolveGeo || 'No resolve GEO'
                // console.log('resolveGeo:', resolveGeo)
                // console.log('\nGeoRules:',geoRules)
                // geoRules.geo.map(item=>{
                //     console.log(item)
                // } )

            } else {
                params.response.resolveGeo = 'There is no GEO restriction set up'
            }

            let campaignInfo = await getData(`campaign-${decodedObj.campaignId}`) || []
            params.response.campaignInfo = campaignInfo
            if (campaignInfo.targetRules) {
                let resolveCampaignRules = await resolveRules(params, campaignInfo.targetRules)
                // response.campaignrules = parseJson(campaignInfo.rules)
                // response.campaignrules = 'uncomment this line'
                params.response.resolveCampaignRules = resolveCampaignRules

            } else {
                params.response.resolveCampaignRules = 'There is no campaign targetRules'
            }

            params.offerId = decodedObj.offerId
            params.affiliateId = campaignInfo.affiliateId
            params.campaignId = decodedObj.campaignId
            params.landingPageId = offerInfo.landingPageId
            params.landingPageUrl = offerInfo.landingPageUrl
            // res.send(response)
            // return
            if (debug) {
                params.response.headers = req.headers
                params.response.ip = req.ip
                // response.req = req
                // console.log(req)
                res.send(params)
                return
            }
            params.lid = v4()

            let lidObj = lidOffer(req, params)
            createLidOffer(lidObj)

            params.endTime = new Date() - params.startTime
            params.response.lidObjOffer = lidObj
            params.response.endTime = params.endTime
            metrics.influxdb(200, `offer`)
            console.log(` **** response lid { ${params.lid} } \n${JSON.stringify(params.response)}  \n `)
            res.send(params)

        } catch (e) {
            catchHandler(e, 'offerError')
            console.log(e)
            metrics.influxdb(500, `offerError`)
            next(e)
        }

    }

}


const parseJson = (data) => {
    try {
        return JSON.parse(data)
    } catch (e) {
        console.log('parseJsonError:', e)
        catchHandler(e, 'parseJsonError')
    }

}

module.exports = offers
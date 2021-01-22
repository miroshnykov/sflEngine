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

// offer 2  camp 2 stage
// https://sfl-engin.surge.systems/ad?offer=d0889832773b232bf51cafd7e0f0dea9:f19fa31d3df0bbf2a6d14be452d5413f2d4fb6e39ae270e8e839739641a523b93fd6acdbaf3c61e46eec326200a54e56

// offer 2  camp 4 stage
// https://sfl-engin.surge.systems/ad?offer=2b4dec88c6269685cddeedaf6f2f938e:914ea3efb89e3bec7daaeb5cae74995ccc436e514c8d5884b0748fd01a0814ed7cff3d4d8f774e891e57a5e86daabc7f

let offers = {
    ad: async (req, res, next) => {
        try {

            metrics.influxdb(200, `offersAD`)

            let params = await getOfferParams(req)
            const debug = params.debugging === `debugging` && true || false

            let decodedOfferId = decrypt(params.offerId)
            params.response.decodedOfferId = decodedOfferId

            let decodedObj = parseJson(decodedOfferId)
            params.response.decodedObj = decodedObj

            let offerInfo = await getData(`offer-${decodedObj.offerId}`) || []
            let campaignInfo = await getData(`campaign-${decodedObj.campaignId}`) || []



            params.response.offerInfo = offerInfo
            params.response.redirectUrl = offerInfo.landingPageUrl || ''
            params.lid = v4()

            params.offerId = decodedObj.offerId
            params.affiliateId = campaignInfo.affiliateId
            params.campaignId = decodedObj.campaignId
            params.landingPageId = offerInfo.landingPageId
            params.landingPageUrl = offerInfo.landingPageUrl

            metrics.influxdb(200, `offerId-${params.offerId}`)
            metrics.influxdb(200, `campaignId-${params.campaignId}`)

            if (debug) {
                params.response.headers = req.headers
                params.response.ip = req.ip
            }

            // //
            // if (offerInfo.capOverrideOfferId) {
            //     params.cap = '*************** capOverride ************* '
            //     params.landingPageIdOrigin = offerInfo.landingPageIdOrigin || 0
            //     params.capOverrideOfferId = offerInfo.capOverrideOfferId || 0
            //     let offerRedirectInfo = await getData(`offer-${offerInfo.capOverrideOfferId}`) || []
            //     // console.log('offerRedirectInfo:',offerRedirectInfo)
            //     params.FinalRedirectionResolveCaps = offerRedirectInfo.landingPageUrl
            //     params.response.CapFound = ` ***** FOUND CAPS *****`
            //     let lidObj = lidOffer(req, params)
            //     createLidOffer(lidObj)
            //     params.response.lidObj = lidObj
            //
            //
            //     metrics.influxdb(200, `offerCaps`)
            //
            //
            //     if (!debug) {
            //         // res.redirect(resultBlockSegments.lp)
            //         params.willBERedirect = 'willBERedirectCap'
            //         res.send(params)
            //         return
            //     } else {
            //         res.send(params)
            //         return
            //     }
            //
            // }


            // if (offerInfo.customLpRules) {
            //     params.response.customLpRulesExists = '*************** customLpRules ************* '
            //     let customLpRules = parseJson(offerInfo.customLpRules)
            //     params.response.customLpRules = customLpRules
            //     // console.log('resolveGeo:', resolveGeo)
            //     // console.log('\nGeoRules:',geoRules)
            //     // geoRules.geo.map(item=>{
            //     //     console.log(item)
            //     // } )
            //     params.FinalRedirectionResolveCustomLpRules = 'addedLater'
            //     metrics.influxdb(200, `offerGeoRestriction`)
            //     if (!debug) {
            //         // res.redirect(resultBlockSegments.lp)
            //         params.willBERedirectcustomLpRules = 'willBERedirectcustomLpRules'
            //         res.send(params)
            //         return
            //     } else {
            //         res.send(params)
            //         return
            //     }
            //
            //
            // } else {
            //     params.response.customLpRules = 'There is no customLpRules  set up'
            // }

            if (offerInfo.geoRules) {
                let geoRules = parseJson(offerInfo.geoRules)
                params.response.geoRules = geoRules
                let resolveGeo = await geoRestrictions(params.country, geoRules.geo)
                if (resolveGeo.length !==0){

                    params.response.countryBan =  resolveGeo
                    params.response.geoRestictinFound = ` ***** FOUND GEO RESTICTIONS **** `
                    params.FinalRedirectionResolveGeo = 'I DON"T KNOW FOR NOW WILL FIGURE OUT'

                    let lidObj = lidOffer(req, params)
                    createLidOffer(lidObj)
                    params.response.lidObj = lidObj
                    metrics.influxdb(200, `offerGeoRestriction`)
                    if (!debug) {
                        // res.redirect(resultBlockSegments.lp)
                        res.send(params)
                        return
                    } else {
                        res.send(params)
                        return
                    }


                } else {
                    params.response.countryBan =  'No country Ban'
                }

            } else {
                params.response.resolveGeo = 'There is no GEO restriction set up'
            }


            params.response.campaignInfo = campaignInfo
            if (campaignInfo.targetRules) {
                let resolveCampaignRules = await resolveRules(params, campaignInfo.targetRules)
                // response.campaignrules = parseJson(campaignInfo.rules)
                // response.campaignrules = 'uncomment this line'
                if (resolveCampaignRules.length !== 0) {
                    // params.FinalRedirection = 'I DON"T KNOW FOR NOW WILL FIGURE OUT'
                    params.resplveCampaignTargetingRules = 'resplveCampaignTargetingRules'
                    params.response.resolveCampaignRules = resolveCampaignRules

                    params.response.campaignTargetRoulsFound = ` ***** FOUND CAMPAIGN TARGET RULES ****`

                    let lidObj = lidOffer(req, params)
                    createLidOffer(lidObj)
                    params.response.lidObj = lidObj
                    params.FinalRedirectionResolveCampaignRules = "CampaignsRulesUrlWillBeAddLater"

                    metrics.influxdb(200, `offerCampaignRules`)
                    if (!debug) {
                        // res.redirect(resultBlockSegments.lp)
                        params.willBERedirectCampaignTargetRules = 'willBERedirectCampaignTargetRules'
                        res.send(params)
                        return
                    } else {
                        res.send(params)
                        return
                    }

                }

            } else {
                params.response.resolveCampaignRules = 'There is no campaign targetRules'
            }


            let lidObj = lidOffer(req, params)
            createLidOffer(lidObj)

            params.endTime = new Date() - params.startTime
            params.response.lidObjOffer = lidObj
            params.response.endTime = params.endTime
            metrics.influxdb(200, `offerDefault`)
            console.log(` **** response lid { ${params.lid} } \n${JSON.stringify(params.response)}  \n `)
            params.default = `No condition (NO caps, GEORestriction, CustomLP)`
            params.FinalRedirectionResolveDefault = params.landingPageUrl
            if (!debug) {
                // res.redirect(resultBlockSegments.lp)
                res.send(params)
                return
            } else {
                res.send(params)
                return
            }

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
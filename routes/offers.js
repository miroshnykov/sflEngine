const {getData} = require('../cache/local/offers')
const config = require('plain-config')()

const {createLidOffer} = require('../lib/dynamoDb')
const {geoRestrictions} = require('../lib/offers/geoRestrictions')
const {customLP} = require('../lib/offers/customLp')
const {resolveRules} = require('../lib/offers/rulesResolve')
const {getOfferParams} = require('../lib/params')

const {v4} = require('uuid')
const metrics = require('../metrics')
const {decrypt} = require('../lib/offers/decrypt')
const {lidOffer} = require('../lib/lid')
const {sendMessageToQueue} = require('../sqs/sqs')

const {catchHandler} = require('../middlewares/catchErr')

const logger = require('bunyan-loader')(config.log).child({scope: 'offers.js'})

// offer id 1050
// http://localhost:8088/ad?offer=aa566134b0f8dd96fd45976c643a97f7:250c33eb1c03786ae743230cea1a520567b7d16c558f2728ffcf3b055159b20544f5d82dad91e54c110c2ba4193d0253&debugging=debugging

// offer 62  camp 51  LOCAL
// http://localhost:8088/ad?offer=51d027447b3b9f2556bae568f7766a16:5f0a090841abd8fa94805b321fe821388791f64d19b8202329f19311c02ff11174ec22eeb96919756a0f21c0192d7837

// offer 64  camp 52  LOCAL
// http://localhost:8088/ad?offer=1ebea97fedca9d89eb4eec7f55a9fea1:6cb8a2174703bcaf94e088c93a728646a21f74d47b7448a532d1169c95a8d0613791dfe21b714b931442d0c992639eff

// offer id 28 with cap
// http://localhost:8088/ad?offer=d6a5c6885f46299bdc3df7402eff9132:78c249392e405e8d5f747c7d1aadb118afce7de44de6078f7a0c3026b6ddbe41beee2da1aea5ae5c2cebe79af15fba73

// offer 6 stage
// https://sfl-engin-staging.surge.systems/ad?offer=29152edc3f320183afa799a07c16709c:5f52073798d7b90a8812f5b50673897848074900f0db47eb1ca65022b92dfc7bdb845e16d6b966c7fef63e33204bf025&debugging=debugging

// offer 2  camp 2 stage
// https://sfl-engin.surge.systems/ad?offer=d0889832773b232bf51cafd7e0f0dea9:f19fa31d3df0bbf2a6d14be452d5413f2d4fb6e39ae270e8e839739641a523b93fd6acdbaf3c61e46eec326200a54e56

// offer 2  camp 4 stage
// https://sfl-engin.surge.systems/ad?offer=2b4dec88c6269685cddeedaf6f2f938e:914ea3efb89e3bec7daaeb5cae74995ccc436e514c8d5884b0748fd01a0814ed7cff3d4d8f774e891e57a5e86daabc7f&debugging=debugging

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
            params.response.campaignInfo = campaignInfo
            params.lid = v4()

            params.offerId = decodedObj.offerId
            params.affiliateId = campaignInfo.affiliateId
            params.campaignId = decodedObj.campaignId
            params.landingPageId = offerInfo.landingPageId
            params.landingPageUrl = offerInfo.landingPageUrl
            params.conversionType = offerInfo.conversionType
            params.payoutPercent = offerInfo.payoutPercent
            params.isCpmOptionEnabled = offerInfo.isCpmOptionEnabled
            params.verticals = offerInfo.verticals
            params.advertiserId = offerInfo.advertiserId
            params.advertiserName = offerInfo.advertiserName
            params.verticalId = offerInfo.verticalId

            metrics.influxdb(200, `offerId-${params.offerId}`)
            metrics.influxdb(200, `campaignId-${params.campaignId}`)

            if (debug) {
                params.response.headers = req.headers
                params.response.ip = req.ip
            }

            // //
            if (offerInfo.capOverrideOfferId) {
                params.cap = '*************** capOverride ************* '
                params.landingPageIdOrigin = offerInfo.landingPageIdOrigin || 0
                params.capOverrideOfferId = offerInfo.capOverrideOfferId || 0
                let offerRedirectInfo = await getData(`offer-${offerInfo.capOverrideOfferId}`) || []
                params.response.CapFound = ` ***** FOUND CAPS *****`
                params.response.CapRedirectOfferInfo = offerRedirectInfo
                let lidObj = lidOffer(req, params)
                params.lid = lidObj.lid
                logger.info(`CapsOfferRedirectInfo:${JSON.stringify(offerRedirectInfo)}`)
                params.redirectType = 'typeCaps'
                let finalRedirectionResolveCaps = await redirectUrl(offerRedirectInfo.landingPageUrl, params)
                params.FinalRedirectionResolveCaps = finalRedirectionResolveCaps
                createLidOffer(lidObj)
                params.response.lidObj = lidObj

                metrics.influxdb(200, `offerCaps`)

                if (!debug) {
                    res.redirect(finalRedirectionResolveCaps)
                    // params.willBERedirect = 'willBERedirectCap'
                    // res.send(params)
                    return
                } else {
                    res.send(params)
                    return
                }

            }


            if (offerInfo.customLpRules) {

                let customLPRules = parseJson(offerInfo.customLpRules)
                let resolveCustomLP = await customLP(params.country, customLPRules.customLPRules)
                if (resolveCustomLP.length !== 0) {
                    params.response.customLpRulesExists = '*************** customLpRules ************* '
                    params.response.resolveCustomLP = resolveCustomLP

                    metrics.influxdb(200, `offerGeoRestriction`)
                    let lidObj = lidOffer(req, params)
                    createLidOffer(lidObj)
                    params.response.lidObj = lidObj
                    params.lid = lidObj.lid
                    params.redirectType = 'typeCustomLandingPages'
                    let finalRedirectionResolveCustomLpRules = await redirectUrl(resolveCustomLP[0].lpUrl, params)
                    params.FinalRedirectionResolveCustomLpRules = finalRedirectionResolveCustomLpRules
                    if (!debug) {
                        res.redirect(finalRedirectionResolveCustomLpRules)
                        // params.willBERedirectcustomLpRules = 'willBERedirectcustomLpRules'
                        // res.send(params)
                        return
                    } else {
                        res.send(params)
                        return
                    }

                } else {
                    params.response.customLpRules = 'customLpRules not resolved'
                }
                //params.response.customLpRules = customLpRules
                // console.log('resolveGeo:', resolveGeo)
                // console.log('\nGeoRules:',geoRules)
                // geoRules.geo.map(item=>{
                //     console.log(item)
                // } )


            } else {
                params.response.customLpRules = 'There is no customLpRules  set up'
            }

            if (offerInfo.geoRules) {
                let geoRules = parseJson(offerInfo.geoRules)
                params.response.geoRules = geoRules
                let resolveGeo = await geoRestrictions(params.country, geoRules.geo)
                if (resolveGeo.length !== 0) {

                    params.response.countryBan = resolveGeo
                    params.response.geoRestictinFound = ` ***** FOUND GEO RESTICTIONS **** `
                    let lidObj = lidOffer(req, params)

                    createLidOffer(lidObj)
                    params.response.lidObj = lidObj
                    params.lid = lidObj.lid
                    params.redirectType = 'typeGeoRules'
                    let finalRedirectionResolveGeo = await redirectUrl(params.landingPageUrl, params)
                    params.FinalRedirectionResolveGeo = finalRedirectionResolveGeo
                    metrics.influxdb(200, `offerGeoRestriction`)
                    if (!debug) {
                        res.redirect(finalRedirectionResolveGeo)
                        // res.send(params)
                        return
                    } else {
                        res.send(params)
                        return
                    }


                } else {
                    params.response.countryBan = 'No country Ban'
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
                    let finalRedirectionResolveCampaignTargetRules = await redirectUrl(params.landingPageUrl, params)
                    params.finalRedirectionResolveCampaignTargetRules = finalRedirectionResolveCampaignTargetRules

                    // let finalRedirectionResolveCampaignRules = "https://CampaignsRulesUrlWillBeAddLater.com"
                    // params.FinalRedirectionResolveCampaignRules = finalRedirectionResolveCampaignRules

                    metrics.influxdb(200, `offerCampaignRules`)
                    if (!debug) {
                        res.redirect(finalRedirectionResolveCampaignTargetRules)
                        // params.willBERedirectCampaignTargetRules = 'willBERedirectCampaignTargetRules'
                        // res.send(params)
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
            params.lid = lidObj.lid
            // params.endTime = new Date() - params.startTime
            params.response.lidObjOffer = lidObj
            params.response.endTime = params.endTime
            metrics.influxdb(200, `offerDefault`)
            logger.info(` **** response lid { ${params.lid} } ${JSON.stringify(params.response)}`)
            params.default = `No condition (NO caps, GEORestriction, CustomLP)`

            params.redirectType = 'typeDefault'
            let finalRedirectionResolveDefault = await redirectUrl(params.landingPageUrl, params)
            params.FinalRedirectionResolveDefault = finalRedirectionResolveDefault
            if (!debug) {
                res.redirect(finalRedirectionResolveDefault)
                // res.send(params)
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


const url = require('url')

const redirectUrl = async (lp, params) => {

    // default
    lp = lp && lp || `https://no-Landing-pages-found-set-this-like-default-type-${params.redirectType}.com/`
    let urlToRedirect = lp + url.format({
        query: {
            'offer_id': params.offerId || 0,
            'campaign_id': params.campaignId || 0,
            'lid': params.lid || '',
        }
    })

    let prefix = 'http'

    if (urlToRedirect.substr(0, prefix.length) !== prefix) {
        urlToRedirect = prefix + '://' + urlToRedirect
    }

    if (params.conversionType === 'cpm') {
        await sqsConversionTypeCmp(params)
    }


    return urlToRedirect
}

const sqsConversionTypeCmp = async (params) => {

    let conversionTypeCpmBody = {}
    conversionTypeCpmBody.lid = params.lid
    conversionTypeCpmBody.offerId = params.response.offerInfo.offerId
    conversionTypeCpmBody.name = params.response.offerInfo.name
    conversionTypeCpmBody.advertiser = params.response.offerInfo.advertiser
    conversionTypeCpmBody.verticals = params.response.offerInfo.verticals
    conversionTypeCpmBody.conversionType = params.response.offerInfo.conversionType
    conversionTypeCpmBody.status = params.response.offerInfo.status
    conversionTypeCpmBody.payin = params.response.offerInfo.payin
    conversionTypeCpmBody.payout = params.response.offerInfo.payout
    conversionTypeCpmBody.landingPageId = params.response.offerInfo.landingPageId
    conversionTypeCpmBody.landingPageUrl = params.response.offerInfo.landingPageUrl
    conversionTypeCpmBody.campaignId = params.response.campaignInfo.campaignId
    conversionTypeCpmBody.affiliateId = params.response.campaignInfo.affiliateId

    let obj = {}
    obj._comments = 'conversion type cpm'
    obj.type = 'offer_conversion_type_cpm'
    obj.id = params.response.offerInfo.offerId
    obj.action = 'update'
    obj.body = `${JSON.stringify(conversionTypeCpmBody)}`

    // console.log(obj)
    logger.info(`Added to SQS Conversion Type Cmp, Body:${JSON.stringify(obj)}`)
    let sqsData = await sendMessageToQueue(obj)
    params.sendTOSQS = sqsData
    params.sendTOSQSBody = obj
    // console.log(`Added update to redis sqs:${JSON.stringify(sqsData)}`)

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
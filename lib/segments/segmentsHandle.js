const {
    getBlockSegmentsLocal,
    getStandardSegmentsLocal,
    getLandingPagesLocal
} = require('../../cache/local/segments')
const {
    resolveDimension,
    checkAnd,
    checkOR
} = require('../segments/resloveSegments')
const {performance} = require('perf_hooks')

const {v4} = require('uuid')
const {lidSfl} = require('../lid')
const {
    proportionalDistributionsLP,
    rangeSpeed,
    rangeTime,
    replaceWebsiteReferer,
    getAffiliateHash
} = require('../utils')
const {createLidAndSendAggrStats} = require('../dynamoDb')
const {redirectUrl} = require('../redirectUrl')
const {getDataCache} = require('../../cache/redis')

const metrics = require('../../metrics')
const {catchHandler} = require('../../middlewares/catchErr')

const {getAffiliatesWebsitesByIdEvent} = require('../../cache/localCache')

const config = require('plain-config')()
const logger = require('bunyan-loader')(config.log).child({scope: 'segmentsHandle.js'})
const {
    getBlockSegmentsEvent,
    getStandardSegmentsEvent,
    getLandingPagesEvent,
    getAffiliatesByIdEvent,
    getAdvertisersByProdIdEvent,
    getRandomSitesEvent,
} = require('../../cache/localCache')


const {
    pickRandomSites
} = require('../utils')


const pattern = /^https?\:\/\/www.|^www.?|^https?\:\/\/|^www.?|\.([^.]*)$/g

const standardSegmentsHandle = async (req, res, params) => {
    try {
        params.type = 'standard'
        return await calculateSegments(req, res, params)

    } catch (e) {
        logger.error('standardSegmentsResolveErr:', e)
        catchHandler(e, 'standardSegmentsResolve')
    }

}

const blockSegmentsHandle = async (req, res, params) => {
    try {

        params.type = 'block'
        return await calculateSegments(req, res, params)

    } catch (e) {
        logger.error('blockSegmentsResolveErr:', e)
        catchHandler(e, 'blockSegmentsResolve')
    }
}

const calculateSegments = async (req, res, params) => {
    try {

        // let startTimeSegmentProcessing = performance.now()
        let generalSegments = []
        let fraudWebsites = []
        let fraudWebsiteTest = []
        let awsComplaintsOrFraudCampaigns = []
        if (params.type === 'block') {
            generalSegments = await getBlockSegmentsEvent() || []
            fraudWebsiteTest = generalSegments.filter(i => (i.segmentId === config.fraudSegments.segmentBlockWebsiteTest))

            fraudWebsites = generalSegments.filter(i => (i.segmentId === config.fraudSegments.segmentBlockWebsite))
            awsComplaintsOrFraudCampaigns = generalSegments.filter(i => (
                i.segmentId === config.fraudSegments.segmentBlockCampaign
                || i.segmentId === config.fraudSegments.segmentBlockAWSComplaints)
            )
            generalSegments = generalSegments.filter(i => (
                i.segmentId !== config.fraudSegments.segmentBlockWebsite
                && i.segmentId !== config.fraudSegments.segmentBlockCampaign)
            )
        } else if (params.type === 'standard') {
            generalSegments = await getStandardSegmentsEvent() || []
        }

        let input = {}

        const {affiliateId, campaignId, country, prod, os} = params

        input.affiliateId = affiliateId
        input.campaignId = campaignId
        input.country = country
        input.os = os
        input.prod = prod
        input.website = params.refererDomain
        input.affiliateType = params.affiliate_type
        input.affiliateStatus = params.affiliate_status
        input.advertiserId = params.advertiserInfo && params.advertiserInfo.advertiserId ? params.advertiserInfo.advertiserId.toString() : ''
        input.advertiserName = params.advertiserInfo && params.advertiserInfo.advertiserId ? params.advertiserInfo.advertiserName : ''
        if (params.debug) {
            params[`${params.type}INPUT_DATA`] = input
            if (generalSegments.length < 50) {
                params[`${params.type}generalSegments`] = generalSegments
            } else {
                params[`${params.type}generalSegmentsCount`] = generalSegments.length
            }

            // params[`${type}Hostname`] = `${req.protocol}-${req.hostname}`
            // params[`${type}generalSegments`] = generalSegments
        }
        let segmentsResolve = []

        if (awsComplaintsOrFraudCampaigns.length !== 0) {
            if (params.debug) {
                params[`AWSComplaintsOrfraudCampaignCount`] = awsComplaintsOrFraudCampaigns.length
                // params[`AWSComplaintsOrfraudCampaign`] = AWSComplaintsOrfraudCampaign
            }

            let searchFraudCampaign = awsComplaintsOrFraudCampaigns.filter(c => (
                c.value === `${input.affiliateId}/${input.campaignId}`)
            )
            if (searchFraudCampaign.length !== 0) {
                // console.log(`FOUND by FraudCampaign segment ID ${searchFraudCampaign[0].segmentId}`)
                segmentsResolve.push({
                    segmentId: searchFraudCampaign[0].segmentId,
                    isOverrideProduct: false
                })
            }

        }

        if (fraudWebsiteTest.length !== 0 && segmentsResolve.length === 0 && params.refererDomain !== '') {

            let rSite = fraudWebsiteTest.filter(i => (
                replaceWebsiteReferer(params.refererDomain) === replaceWebsiteReferer(i.value)
            ))
            if (rSite.length !== 0) {
                console.log(`FOUND by fraudWebsiteTest segment ID ${fraudWebsiteTest[0].segmentId}`)
                segmentsResolve.push({
                    segmentId: fraudWebsiteTest[0].segmentId,
                    isOverrideProduct: false
                })
            }
        }

        if (fraudWebsites.length !== 0 && segmentsResolve.length === 0 && params.refererDomain !== '') {
            if (params.debug) {
                params[`fraudWebsitesCount`] = fraudWebsites.length
                // params[`fraudWebsites`] = fraudWebsites
            }
            let rSite = fraudWebsites.filter(i => (
                replaceWebsiteReferer(params.refererDomain) === replaceWebsiteReferer(i.value)
            ))
            if (rSite.length !== 0) {
                console.log(`FOUND by fraudWebsites segment ID ${fraudWebsites[0].segmentId}`)
                segmentsResolve.push({
                    segmentId: fraudWebsites[0].segmentId,
                    isOverrideProduct: false
                })
            }
        }

        if (segmentsResolve.length === 0) {

            let websiteDomainReferer = replaceWebsiteReferer(params.refererDomain)

            let belongsSegmentIds = generalSegments.filter(i => {
                return (i.dimension === `affiliate` && i.value === input.affiliateId)
                    || (i.dimension === `affiliate_campaign` && i.value === `${input.affiliateId}/${input.campaignId}`)
                    || (i.dimension === `country` && i.value === input.country)
                    || (i.dimension === `prod` && i.value === input.prod)
                    || (i.dimension === `os` && i.value === input.os)
                    || (i.dimension === `affiliate_status` && i.value === input.affiliateStatus)
                    || (i.dimension === `affiliate_type` && i.value === input.affiliateType)
                    || (i.dimension === `advertisers` && i.value === input.advertiserId)
                    || (i.dimension === `website` && websiteDomainReferer === replaceWebsiteReferer(i.value))
                    || i.include
            }).map(segment => (segment.segmentId))

            generalSegments = generalSegments.filter(i => (belongsSegmentIds.includes(i.segmentId)))

            if (params.debug) {
                // params[`belongsSegmentIds`] = belongsSegmentIds
                if (generalSegments.length < 250) {
                    params[`${params.type}SEGMENTS_BEFORE_PROCESSING`] = generalSegments
                } else {
                    params[`${params.type}SEGMENTS_BEFORE_PROCESSING_COUNT`] = generalSegments.length
                }


            }

            // console.log(`\n${type}-Segment count before processing:${generalSegments.length}`)
            let checkLastSegmentId = 0
            let segmentConditions = []

            for (let i = 0, len = generalSegments.length; i < len; i++) {
                let resolveSegment = await resolveDimension(params, generalSegments[i])
                generalSegments[i].resolve = resolveSegment && true || false
                segmentConditions.push(generalSegments[i])
                if (checkLastSegmentId === generalSegments[i].countConditionsBySegment - 1) {
                    // console.log(` **** change segment id ${segment_.segmentId}, value:${segment_.value}`)
                    checkLastSegmentId = 0
                    // break
                    // console.log(`segmentConditions.length:${segmentConditions.length}`)
                    orAndCalculate(segmentConditions)

                    if (segmentConditions.length !== 0) {
                        let currentSegmentId = segmentConditions[0].segmentId
                        let isOverrideProduct = segmentConditions[0].isOverrideProduct
                        let maximumRulesIndex = segmentConditions[0].maximumRulesIndex

                        // console.log(`currentSegmentId:${currentSegmentId}, maximumRulesIndex:${maximumRulesIndex}`)

                        let checkConditionTrue = 0
                        for (let j = 0, len = segmentConditions.length; j < len; j++) {
                            if (segmentConditions[j].match === true) {
                                checkConditionTrue++
                            }
                            // console.log(`checkConditionTrue:${checkConditionTrue}, maximumRulesIndex:${maximumRulesIndex}`)
                            if (checkConditionTrue > 0 && maximumRulesIndex + 1 === checkConditionTrue) {
                                let existsSegmentCheck = segmentsResolve.filter(i => (i.segmentId === currentSegmentId))
                                if (existsSegmentCheck.length === 0) {
                                    // console.log(`Resolved:${currentSegmentId}`)
                                    segmentsResolve.push({
                                        segmentId: currentSegmentId,
                                        isOverrideProduct: isOverrideProduct
                                    })
                                }
                            }

                        }
                    }

                    segmentConditions.length = 0
                    if (segmentsResolve.length !== 0) {
                        // console.log(`\n\n Solved segment:${JSON.stringify(segmentsResolve)},  exit from loop `)
                        break
                    }
                } else {
                    // segmentConditions.push(segment_)
                    checkLastSegmentId++
                }

            }

        }
        if (segmentsResolve.length !== 0) {
            if (params.debug) {
                params[`${params.type}SegmentResolveInfo`] = generalSegments.filter(i => (i.segmentId === segmentsResolve[0].segmentId))
            }
        }
        return await segmentResolveProcessing(req, res, segmentsResolve, params)


    } catch (e) {
        metrics.influxdb(500, `calculateSegmentsError-${params.type}`)
        logger.error('calculateSegmentsError:', e)
        catchHandler(e, 'calculateSegmentsError')
    }

}

const segmentResolveProcessing = async (req, res, segmentsResolve, params) => {
    if (segmentsResolve.length !== 0) {
        // logger.info(` ${type}SegmentsResolve ${JSON.stringify(segmentsResolve)}`)
        let date = new Date()
        params.lid = v4()
        // params.lidSegment = params.lid
        let lidForSegment = lidSfl(req, params)
        // lidForSegment['affiliateId'] = params.affiliateId
        lidForSegment['affiliate_id'] = params.affiliateId
        // lidForSegment['campaignId'] = params.campaignId
        lidForSegment['campaign_id'] = params.campaignId
        // lidForSegment['programId'] = params.programId
        lidForSegment['program_id'] = params.programId

        lidForSegment['program'] = params.program_name
        lidForSegment['product'] = params.product_name

        lidForSegment['advertiser_id'] = params.advertiser_id

        lidForSegment['advertiser'] = params.advertiser_name
        lidForSegment['advertiser_program_id'] = params.advertiser_program_id
        lidForSegment['advertiser_program'] = params.advertiser_program
        lidForSegment['advertiser_name'] = params.advertiser_name
        lidForSegment['advertiser_product_id'] = params.advertiser_product_id
        lidForSegment['advertiser_product_name'] = params.advertiser_product_name
        lidForSegment['account_executive'] = params.account_executive
        lidForSegment['account_manager'] = params.account_manager
        lidForSegment['os_version'] = params.os_version
        lidForSegment['browser_version'] = params.browser_version
        lidForSegment['hour'] = date.getHours() || 0
        lidForSegment['ad_domain'] = params.ad_domain
        lidForSegment['server_name'] = params.server_name

        // params[`${type}SegmentsResolveTakeFirst`] = segmentsResolve[0]

        lidForSegment['segment_id'] = segmentsResolve[0].segmentId
        let lp = await getLandingPagesEvent() || []

        let segmentLps = lp.filter(item => item.segmentId === segmentsResolve[0].segmentId)

        let resolveLP = proportionalDistributionsLP(segmentLps)

        if (!resolveLP.staticUrl) {
            let randomSites = await getRandomSitesEvent()
            resolveLP.staticUrl = pickRandomSites(randomSites)
            resolveLP.name = 'randomSites'

        }
        lidForSegment['landing_page'] = resolveLP.name || ''
        lidForSegment['landing_page_id'] = resolveLP.landingPageId || ''
        if (params.debug) {
            params[`${params.type}SegmentIdResolve`] = segmentsResolve[0].segmentId
            params[`${params.type}SegmentLandingPages`] = segmentLps
            params[`${params.type}SegmentResolveLP`] = resolveLP.staticUrl
            params['segmentType'] = params.type
        }

        lidForSegment['is_override'] = false

        lidForSegment['overridden_product_id'] = +resolveLP.productId
        lidForSegment['overridden_program_id'] = +resolveLP.programId

        if (segmentsResolve[0].isOverrideProduct) {
            await overrideProduct(segmentsResolve, lidForSegment, params, resolveLP)
        }
        lidForSegment['account_executive_id'] = params.affInfo && params.affInfo.accountExecutiveId || 0
        lidForSegment['account_manager_id'] = params.affInfo && params.affInfo.accountManagerId || 0
        lidForSegment['affiliate_type'] = params.affiliate_type = params.affInfo && params.affInfo.affiliateType || ''
        lidForSegment['os'] = params.osOrigin || ''
        lidForSegment['sub_campaign'] = params.sub_campaign || ''
        lidForSegment['segmentType'] = params.type || ''
        lidForSegment['refererDomain'] = params.refererDomain || ''
        lidForSegment['refererPath'] = params.refererPath || ''
        lidForSegment['affiliate'] = params.affiliateName || ''
        lidForSegment['country_code'] = params.country || ''
        lidForSegment['unique_visit'] = params.unique_visit || 1
        params.affiliate_hash = getAffiliateHash(config.affiliateIdHashSalt, lidForSegment.affiliate_id)
        lidForSegment['affiliate_hash'] = params.affiliate_hash || ''
        lidForSegment['browser_language'] = params.browser_language || ''
        params.landingPage = resolveLP.staticUrl
        let finalRedirectToSegment = redirectUrl(req, res, params)
        // lidForSegment['landing_page_static_url'] = finalRedirectToSegment
        lidForSegment['redirect_url'] = finalRedirectToSegment
        if (params.debug) {
            params[`${params.type}SegmentsUrlPreFinalSolved`] = finalRedirectToSegment
            params[`${params.type}SegmentsMatchedSolved`] = segmentsResolve
            params[`${params.type}SegmentLidFor`] = lidForSegment
        }

        createLidAndSendAggrStats(lidForSegment)

        return {
            success: true,
            lp: finalRedirectToSegment,
            segmentId: lidForSegment['segment_id']
        }

    }
}

const overrideProduct = async (segmentsResolve, lidForSegment, params, resolveLP) => {
    if (params.debug) {
        params[`${params.type}isOverrideProduct`] = segmentsResolve[0].isOverrideProduct
        params[`${params.type}OverrideToPROD `] = resolveLP.productId
        params.query.prod = resolveLP.productId
    }

    lidForSegment['orign_product_id'] = params.product_id
    lidForSegment['orign_product_name'] = params.product_name
    // lidForSegment['overridden_product_id'] = +resolveLP.productId
    lidForSegment['product_id'] = resolveLP.productId
    params.product_id = resolveLP.productId


    lidForSegment['orign_program_id'] = lidForSegment['program_id']
    // lidForSegment['overridden_program_id'] = +resolveLP.programId
    lidForSegment['program_id'] = resolveLP.programId

    let advertiserOverrideInfo = await getAdvertisersByProdIdEvent(resolveLP.productId)

    // console.log(`advertiserOverrideInfo:${JSON.stringify(advertiserOverrideInfo)}` )
    // lidForSegment['inputAdvertisers'] = params.advertisers
    lidForSegment['orign_advertiser_id'] = params.advertiser_id
    lidForSegment['orign_advertiser_name'] = params.advertiser_name
    lidForSegment['orign_advertiser_product_id'] = params.advertiser_product_id
    lidForSegment['orign_advertiser_product_name'] = params.advertiser_product_name
    params.advertiserInfoOveride = advertiserOverrideInfo

    lidForSegment['advertiser_id'] = advertiserOverrideInfo.advertiserId || 0
    lidForSegment['advertiser_name'] = advertiserOverrideInfo.advertiserName || ''
    lidForSegment['advertiser'] = advertiserOverrideInfo.advertiserName || ''
    lidForSegment['advertiser_product_id'] = advertiserOverrideInfo.advertiserProductId || 0
    lidForSegment['advertiser_product_name'] = advertiserOverrideInfo.advertiserProductName || ''
    lidForSegment['advertiser_program_id'] = advertiserOverrideInfo.advertiserProgramId || ''
    lidForSegment['advertiser_program'] = advertiserOverrideInfo.advertiserProgramName || ''
    lidForSegment['product'] = advertiserOverrideInfo.advertiserProductName || ''
    lidForSegment['is_override'] = true

}

const orAndCalculate = (segmentConditions) => {

    for (let b = 0, len = segmentConditions.length; b < len; b++) {
        let orAnd = segmentConditions.filter(i => (i.segmentRuleIndex === b))

        if (orAnd.length !== 0) {
            if (orAnd[0].orEnd === 'AND') {
                let resolveAnd = checkAnd(orAnd)
                segmentConditions[b].countOfRules = orAnd[0].maximumRulesIndex + 1
                segmentConditions[b].match = resolveAnd

            } else if (orAnd[0].orEnd === 'OR') {
                let resolveOr = checkOR(orAnd)
                segmentConditions[b].countOfRules = orAnd[0].maximumRulesIndex + 1
                segmentConditions[b].match = resolveOr
            }
        }
    }
}

module.exports = {
    blockSegmentsHandle,
    standardSegmentsHandle
}
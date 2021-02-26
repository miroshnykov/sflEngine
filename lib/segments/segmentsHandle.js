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
const {proportionalDistributionsLP, rangeSpeed, rangeTime, getAffiliateHash} = require('../utils')
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
    getAffiliatesByIdEvent
} = require('../../cache/localCache')

const standardSegmentsHandle = async (req, res, params) => {
    try {
        return await calculateSegments(req, res, params, 'standard')

    } catch (e) {
        logger.error('standardSegmentsResolveErr:', e)
        catchHandler(e, 'standardSegmentsResolve')
    }

}

const blockSegmentsHandle = async (req, res, params) => {
    try {


        return await calculateSegments(req, res, params, 'block')

    } catch (e) {
        logger.error('blockSegmentsResolveErr:', e)
        catchHandler(e, 'blockSegmentsResolve')
    }

}
const calculateSegments = async (req, res, params, type) => {
    try {

        // let startTimeSegmentProcessing = performance.now()
        let generalSegments = []
        let fraudWebsites = []
        let fraudCampaign = []
        if (type === 'block') {
            generalSegments = await getBlockSegmentsEvent() || []
            fraudWebsites = generalSegments.filter(i => (i.segmentId === config.fraudSegments.segmentBlockWebsite))
            fraudCampaign = generalSegments.filter(i => (i.segmentId === config.fraudSegments.segmentBlockCampaign))
            generalSegments = generalSegments.filter(i => (
                i.segmentId !== config.fraudSegments.segmentBlockWebsite
                && i.segmentId !== config.fraudSegments.segmentBlockCampaign)
            )
        } else if (type === 'standard') {
            generalSegments = await getStandardSegmentsEvent() || []
        }

        let input = {}

        const {affiliateId, campaignId, country, prod} = params
        input.affiliateId = affiliateId
        input.campaignId = campaignId
        input.country = country
        input.prod = prod
        if (params.debug) {
            params[`${type}Input`] = input
            params[`${type}generalSegmentsCount`] = generalSegments.length
            // params[`${type}generalSegments`] = generalSegments
        }
        let segmentsResolve = []

        if (fraudCampaign.length !== 0) {
            if (params.debug) {
                params[`fraudCampaignCount`] = fraudCampaign.length
                // params[`fraudCampaign`] = fraudCampaign
            }

            let searchFraudCampaign = fraudCampaign.filter(c => (
                c.value === `${input.affiliateId}/${input.campaignId}`)
            )
            if (searchFraudCampaign.length !== 0) {
                console.log(`FOUND by FraudCampaign segment ID ${searchFraudCampaign[0].segmentId}`)
                segmentsResolve.push({
                    segmentId: searchFraudCampaign[0].segmentId,
                    isOverrideProduct: false
                })
            }

        }

        if (fraudWebsites.length !== 0 && segmentsResolve.length === 0) {
            if (params.debug) {
                params[`fraudWebsitesCount`] = fraudWebsites.length
                // params[`fraudWebsites`] = fraudWebsites
            }
            input.website = await getAffiliatesWebsitesByIdEvent(affiliateId)

            if (input.website) {
                let sites = input.website.sites
                let pattern = /^https?\:\/\/www.|^www.?|^https?\:\/\/|^www.?|\.([^.]*)$/g
                let rSite = sites.filter(item => {
                    let searchSite = fraudWebsites.filter(i => (
                        i.value.replace(pattern, '') === item.url.replace(pattern, ''))
                    )
                    if (searchSite.length !== 0) {
                        return item
                    }
                })
                if (rSite.length !== 0) {
                    console.log(`FOUND by fraudWebsites segment ID ${fraudWebsites[0].segmentId}`)
                    segmentsResolve.push({
                        segmentId: fraudWebsites[0].segmentId,
                        isOverrideProduct: false
                    })
                }
            }
        }

        if (segmentsResolve.length === 0) {

            let belongsSegmentIds = generalSegments.filter(i => {
                return (i.dimension === `affiliate` && i.value === input.affiliateId)
                    || (i.dimension === `affiliate_campaign` && i.value === `${input.affiliateId}/${input.campaignId}`)
                    || (i.dimension === `country` && i.value === input.country)
                    || (i.dimension === `prod` && i.value === input.prod)
                    || i.include
            }).map(segment => (segment.segmentId))

            generalSegments = generalSegments.filter(i => {
                return belongsSegmentIds.includes(i.segmentId)
            })
            if (params.debug) {
                // params[`belongsSegmentIds`] = belongsSegmentIds
                params[`SEGMENTS_BEFORE_PROCESSING`] = generalSegments

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

            // let percentage = (process.memoryUsage().heapUsed / process.memoryUsage().heapTotal) * 100
            //
            // if (percentage > 95) {
            //     // console.log(" >>> percentage - " + percentage.toFixed(0) )
            //     metrics.influxdb(200, `PercentageMemory${type}-${percentage.toFixed(0)}`)
            // }
            //
            // let timeSegmentProcessing = performance.now()
            // let totalTime = timeSegmentProcessing - startTimeSegmentProcessing
            // //console.log(`TimeSegment${type}-${totalTime} range-${rangeTime(totalTime)}`)
            // if (rangeTime(totalTime) > 150) {
            //     metrics.influxdb(200, `TimeSegment${type}-${rangeTime(totalTime)}`)
            // }

        }


        if (segmentsResolve.length !== 0) {
            if (params.debug) {
                params[`${type}SegmentResolveInfo`] = generalSegments.filter(i => (i.segmentId === segmentsResolve[0].segmentId))
            }

            // logger.info(` ${type}SegmentsResolve ${JSON.stringify(segmentsResolve)}`)
            params.lid = v4()
            // params.lidSegment = params.lid
            let lidForSegment = lidSfl(req, params)
            lidForSegment['affiliateId'] = params.affiliateId
            lidForSegment['campaignId'] = params.campaignId
            lidForSegment['programId'] = params.programId
            // params[`${type}SegmentsResolveTakeFirst`] = segmentsResolve[0]

            lidForSegment['segmentId'] = segmentsResolve[0].segmentId
            let lp = await getLandingPagesEvent() || []
            let segmentLps = lp.filter(item => item.segmentId === segmentsResolve[0].segmentId)
            let resolveLPIndex = proportionalDistributionsLP(segmentLps)

            if (params.debug) {
                params[`${type}SegmentIdResolve`] = segmentsResolve[0].segmentId
                params[`${type}SegmentLandingPages`] = segmentLps
                params[`${type}SegmentResolveLP`] = resolveLPIndex.staticUrl
                params['segmentType'] = type
            }

            if (segmentsResolve[0].isOverrideProduct) {
                // console.log('\nisOverrideProduct:', isOverrideProduct)
                if (params.debug) {
                    params[`${type}isOverrideProduct`] = segmentsResolve[0].isOverrideProduct
                    params[`${type}OverrideToPROD `] = resolveLPIndex.productId
                    params.query.prod = resolveLPIndex.productId
                }

                lidForSegment['inputProduct'] = +lidForSegment['productId']
                lidForSegment['outputProduct'] = resolveLPIndex.productId
                lidForSegment['productId'] = resolveLPIndex.productId
                lidForSegment['product_id'] = resolveLPIndex.productId
            }


            // let affInfo = await getDataCache(`affiliate-${lidForSegment.affiliateId}`)
            let affInfo = await getAffiliatesByIdEvent(lidForSegment.affiliateId)
            if (!affInfo) {
                // metrics.influxdb(500, `affiliateLocalCacheEmpty`)
                affInfo = await getDataCache(`affiliate-${lidForSegment.affiliateId}`)
                if (!affInfo) {
                    console.log(`RedisEmptyAffiliateId-${lidForSegment.affiliateId}`)
                    // metrics.influxdb(500, `affiliateRedisCacheEmpty`)
                }
            }
            lidForSegment['account_executive_id'] = affInfo && affInfo.accountManagerId || 0
            lidForSegment['account_manager_id'] = affInfo && affInfo.accountManagerId || 0
            lidForSegment['affiliate_type'] = params.affiliate_type = affInfo && affInfo.affiliateType || ''
            lidForSegment['os'] = params.os || ''
            lidForSegment['sub_campaign'] = params.sub_campaign || ''
            lidForSegment['segmentType'] = type || ''
            params.affiliate_hash = getAffiliateHash(config.affiliateIdHashSalt, lidForSegment.affiliateId)

            // res.redirect(resolvLPIndex)
            // res.send(params)
            params.landingPage = resolveLPIndex.staticUrl
            let finalRedirectToSegment = redirectUrl(req, res, params)
            lidForSegment['landing_page'] = finalRedirectToSegment
            if (params.debug) {
                params[`${type}SegmentsUrlPreFinalSolved`] = finalRedirectToSegment
                params[`${type}SegmentsMatchedSolved`] = segmentsResolve
                params[`${type}SegmentLidFor`] = lidForSegment
            }

            createLidAndSendAggrStats(lidForSegment)

            // metrics.influxdb(200, `signup-${type}SegmentsResolveSegmentId-${lidForSegment['segmentId']}`)
            // params.endTime = new Date() - params.startTime
            // metrics.influxdb(200, `Speed-Segments-${type}-${rangeSpeed(params.endTime)}`)


            return {
                success: true,
                lp: finalRedirectToSegment,
                segmentId: lidForSegment['segmentId']
            }

        }

    } catch (e) {
        metrics.influxdb(500, `calculateSegmentsError-${type}`)
        logger.error('calculateSegmentsError:', e)
        catchHandler(e, 'calculateSegmentsError')
    }

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
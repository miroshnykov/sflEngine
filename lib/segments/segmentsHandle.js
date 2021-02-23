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

        let startTimeSegmentProcessing = performance.now()
        let generalSegments
        if (type === 'block') {
            generalSegments = await getBlockSegmentsEvent() || []
        } else if (type === 'standard') {
            generalSegments = await getStandardSegmentsEvent() || []
        }

        // if (params.debug) {
        //     params[`${type}generalSegments`] = generalSegments
        // }

        let checkLastSegmentId = 0
        let segmentsResolve = []
        let segmentConditions = []
        for (const segment_ of generalSegments) {
            let resolveSegment = await resolveDimension(params, segment_)
            segment_.resolve = resolveSegment && true || false
            segmentConditions.push(segment_)
            if (checkLastSegmentId === segment_.countConditionsBySegment - 1) {
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
                    for (const segmentResolveChecking_ of segmentConditions) {
                        if (segmentResolveChecking_.match === true) {
                            checkConditionTrue++
                        }
                        // console.log(`checkConditionTrue:${checkConditionTrue}, maximumRulesIndex:${maximumRulesIndex}`)
                        if (checkConditionTrue > 0 && maximumRulesIndex + 1 === checkConditionTrue) {
                            let existsSegmentCheck = segmentsResolve.filter(i => (i.segmentId === currentSegmentId))
                            if (existsSegmentCheck.length === 0) {
                                // console.log(`Resolved:${currentSegmentId}`)
                                segmentsResolve.push({segmentId: currentSegmentId,isOverrideProduct:isOverrideProduct})
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

        let percentage = (process.memoryUsage().heapUsed / process.memoryUsage().heapTotal) * 100

        if (percentage > 95) {
            // console.log(" >>> percentage - " + percentage.toFixed(0) )
            metrics.influxdb(200, `PercentageMemory${type}-${percentage.toFixed(0)}`)
        }

        let timeSegmentProcessing = performance.now()
        let totalTime = timeSegmentProcessing - startTimeSegmentProcessing
        //console.log(`TimeSegment${type}-${totalTime} range-${rangeTime(totalTime)}`)
        if (rangeTime(totalTime) > 150) {
            metrics.influxdb(200, `TimeSegment${type}-${rangeTime(totalTime)}`)
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

            if (segmentsResolve[0].isOverrideProduct){
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
                metrics.influxdb(500, `affiliateLocalCacheEmpty`)
                affInfo = await getDataCache(`affiliate-${lidForSegment.affiliateId}`)
                if (!affInfo) {
                    console.log(`RedisEmptyAffiliateId-${lidForSegment.affiliateId}`)
                    metrics.influxdb(500, `affiliateRedisCacheEmpty`)
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

            metrics.influxdb(200, `signup-${type}SegmentsResolveSegmentId-${lidForSegment['segmentId']}`)
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

    segmentConditions.forEach((item, key) => {
        let orAnd = segmentConditions.filter(i => (i.segmentRuleIndex === key))

        if (orAnd.length !== 0) {
            if (orAnd[0].orEnd === 'AND') {
                let resolveAnd = checkAnd(orAnd)
                item.countOfRules = orAnd[0].maximumRulesIndex + 1
                item.match = resolveAnd

            } else if (orAnd[0].orEnd === 'OR') {
                let resolveOr = checkOR(orAnd)
                item.countOfRules = orAnd[0].maximumRulesIndex + 1
                item.match = resolveOr
            }
        }
    })
}

module.exports = {
    blockSegmentsHandle,
    standardSegmentsHandle
}
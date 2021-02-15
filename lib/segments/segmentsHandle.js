const {
    getBlockSegmentsLocal,
    getStandardSegmentsLocal,
    getLandingPagesLocal
} = require('../../cache/local/segments')
const {
    resolveSegments,
    resolveDimension,
    checkAnd,
    checkOR
} = require('../segments/resloveSegments')
const {performance} = require('perf_hooks')

const {v4} = require('uuid')
const {lidSfl} = require('../lid')
const {proportionalDistributionsLP, rangeSpeed,rangeTime, getAffiliateHash} = require('../utils')
const {createLidAndSendAggrStats} = require('../dynamoDb')
const {redirectUrl} = require('../redirectUrl')
const {getDataCache} = require('../../cache/redis')

const metrics = require('../../metrics')
const {catchHandler} = require('../../middlewares/catchErr')

const config = require('plain-config')()
const logger = require('bunyan-loader')(config.log).child({scope: 'segmentsHandle.js'})

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
            generalSegments = await getBlockSegmentsLocal() || []
        } else if (type === 'standard') {
            generalSegments = await getStandardSegmentsLocal() || []
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
                break
                // console.log(`segmentConditions.length:${segmentConditions.length}`)
                orAndCalculate(segmentConditions)

                if (segmentConditions.length !== 0) {
                    let currentSegmentId = segmentConditions[0].segmentId
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
                                segmentsResolve.push({segmentId: currentSegmentId})
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

        let timeSegmentProcessing = performance.now()
        let totalTime = timeSegmentProcessing - startTimeSegmentProcessing
        // console.log(`TimeSegment${type}-${totalTime} range-${rangeTime(totalTime)}`)
        metrics.influxdb(200, `TimeSegment${type}-${rangeTime(totalTime)}`)

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
            let lp = await getLandingPagesLocal() || []
            let segmentLps = lp.filter(item => item.segmentId === segmentsResolve[0].segmentId)
            let resolveLPIndex = proportionalDistributionsLP(segmentLps)

            if (params.debug) {
                params[`${type}SegmentIdResolve`] = segmentsResolve[0].segmentId
                params[`${type}SegmentLandingPages`] = segmentLps
                params[`${type}SegmentResolveLP`] = resolveLPIndex
            }

            params['segmentType'] = type

            let affInfo = await getDataCache(`affiliate-${lidForSegment.affiliateId}`)
            lidForSegment['account_executive_id'] = affInfo && affInfo.accountManagerId
            lidForSegment['account_manager_id'] = affInfo && affInfo.accountManagerId
            lidForSegment['affiliate_type'] = params.affiliate_type = affInfo && affInfo.affiliateType
            lidForSegment['os'] = params.os || ''
            lidForSegment['sub_campaign'] = params.sub_campaign || ''
            lidForSegment['segmentType'] = type || ''
            params.affiliate_hash = getAffiliateHash(config.affiliateIdHashSalt, lidForSegment.affiliateId)

            // res.redirect(resolvLPIndex)
            // res.send(params)
            params.landingPage = resolveLPIndex
            let finalRedirectToSegment = redirectUrl(req, res, params)
            lidForSegment['landing_page'] = finalRedirectToSegment
            if (params.debug) {
                params[`${type}SegmentsUrlPreFinalSolved`] = finalRedirectToSegment
                params[`${type}SegmentsMatchedSolved`] = segmentsResolve
                params[`${type}SegmentLidFor`] = lidForSegment
            }

            createLidAndSendAggrStats(lidForSegment)

            metrics.influxdb(200, `signup-${type}SegmentsResolveSegmentId-${lidForSegment['segmentId']}`)
            params.endTime = new Date() - params.startTime
            metrics.influxdb(200, `Speed-Segments-${type}-${rangeSpeed(params.endTime)}`)


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
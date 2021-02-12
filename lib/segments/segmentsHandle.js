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

const {v4} = require('uuid')
const {lidSfl} = require('../lid')
const {proportionalDistributionsLP, rangeSpeed, getAffiliateHash} = require('../utils')
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

        let generalSegments
        if (type === 'block') {
            generalSegments = await getBlockSegmentsLocal() || []
        } else if (type === 'standard') {
            generalSegments = await getStandardSegmentsLocal() || []
        }

        // if (params.debug){
        //     params[`${type}SegmentsExists`] = generalSegments
        // }

        const uniqueSegments = []
        const map = new Map()
        for (const item of generalSegments) {
            if (!map.has(item.segmentId)) {
                map.set(item.segmentId, true)
                uniqueSegments.push(item)
            }
        }
        // console.log('uniqueSegments:', uniqueSegments)
        // params.uniqueSegments = uniqueSegments

        let conditionBySegment = []
        let conditionBySegmentReformat = []
        uniqueSegments.forEach(uniqueSegment => {
            conditionBySegment = generalSegments.filter(({segmentId}) => (Number(segmentId) === uniqueSegment.segmentId))
            conditionBySegment.forEach(condition => {
                const getMaxSegmentRuleIndex = (arr) => {
                    let loadMax = null
                    for (const item of arr) {
                        if (!loadMax || item.segmentRuleIndex > loadMax.segmentRuleIndex) {
                            loadMax = item;
                        }
                    }
                    return loadMax.segmentRuleIndex
                }

                condition.maximumRulesIndex = getMaxSegmentRuleIndex(conditionBySegment)
                let orAnd = conditionBySegment.filter(item => (item.segmentRuleIndex === condition.segmentRuleIndex))
                condition.orEnd = orAnd.length > 1 && 'OR' || 'AND'

            })
            conditionBySegmentReformat.push(conditionBySegment)

        })

        conditionBySegmentReformat = [].concat.apply([], conditionBySegmentReformat)

        // params.conditionBySegmentReformat = conditionBySegmentReformat

        if (params.debug) {
            params[`${type}ConditionBySegmentReformat`] = conditionBySegmentReformat
        }

        // let segmentsResolveOrigin = await resolveSegments(params, conditionBySegmentReformat)
        // if (params.debug) {
        //     params[`${type}uniqueSegments`] = uniqueSegments
        // }

        let calculateSegmentsMatch = []
        for (const segment of uniqueSegments) {
            // let rSegment = []
            let segments = conditionBySegmentReformat.filter(item => (item.segmentId === segment.segmentId))
            for (const segment_ of segments) {
                let resolveSegment = await resolveDimension(params, segment_)
                // console.log('segment_:',segment_)
                // console.log('resolveSegment:',resolveSegment)
                if (resolveSegment) {
                    segment_.resolve = true
                } else {
                    segment_.resolve = false
                }
            }
            // console.log('segments:',segments)
            let segmentResolve = []

            segments.forEach((item, key) => {
                let orAnd = segments.filter(i => (i.segmentRuleIndex === key))

                if (orAnd.length !== 0) {
                    if (orAnd[0].orEnd === 'AND') {
                        let resolveAnd = checkAnd(orAnd)
                        segmentResolve.push({
                            segmentId: orAnd[0].segmentId,
                            segmentName: orAnd[0].name,
                            segmentRuleIndex: orAnd[0].segmentRuleIndex,
                            result: resolveAnd,
                            segmentType: orAnd[0].segmentType,
                            countOfRules: orAnd[0].maximumRulesIndex + 1,
                            dimension: orAnd[0].dimension,
                            includeExclude: orAnd[0].include && 'Exclude' || 'Include'
                        })
                    } else if (orAnd[0].orEnd === 'OR') {
                        let resolveOr = checkOR(orAnd)
                        segmentResolve.push({
                            segmentId: orAnd[0].segmentId,
                            segmentName: orAnd[0].name,
                            segmentRuleIndex: orAnd[0].segmentRuleIndex,
                            result: resolveOr,
                            segmentType: orAnd[0].segmentType,
                            dimension: orAnd[0].dimension,
                            countOfRules: orAnd[0].maximumRulesIndex + 1,
                            includeExclude: orAnd[0].include && 'Exclude' || 'Include'
                        })
                    }
                }
            })

            if (segmentResolve.length !== 0) {
                calculateSegmentsMatch.push(segmentResolve)
            }
        }

        let calculateSegmentsMatchReFormat = [].concat.apply([], calculateSegmentsMatch)
        if (params.debug) {
            params[`${type}CheckingCalculateSegmentsMatch`] = calculateSegmentsMatchReFormat
        }

        let segmentsResolve = []
        uniqueSegments.forEach(uniqueSegmentItem => {
            if (generalSegments.length === 0) return
            let foundConditionsBySegment = generalSegments.filter(({segmentId}) => (Number(segmentId) === uniqueSegmentItem.segmentId))
            if (foundConditionsBySegment.length === 0) return
            let calculateSegment = calculateSegmentsMatchReFormat.filter(i => (i.segmentId === foundConditionsBySegment[0].segmentId))
            let currentSegmentId = foundConditionsBySegment[0].segmentId
            let maximumRulesIndex = foundConditionsBySegment[0].maximumRulesIndex

            let checkConditionTrue = 0
            calculateSegment.forEach((item) => {
                if (item.result === true) {
                    checkConditionTrue++
                }
                // console.log(`checkConditionTrue:${checkConditionTrue}, maximumRulesIndex:${maximumRulesIndex}`)
                if (checkConditionTrue > 0 && maximumRulesIndex + 1 === checkConditionTrue) {
                    let existsSegmentCheck = segmentsResolve.filter(i => (i.segmentId === currentSegmentId))
                    if (existsSegmentCheck.length === 0) {
                        segmentsResolve.push({segmentId: currentSegmentId})
                    }
                }

            })

        })

        if (segmentsResolve.length !== 0) {
            logger.info(` ${type}SegmentsResolve ${JSON.stringify(segmentsResolve)}`)
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
                lp: finalRedirectToSegment
            }

        }

    } catch (e) {
        metrics.influxdb(500, `calculateSegmentsError-${type}`)
        logger.error('calculateSegmentsError:', e)
        catchHandler(e, 'calculateSegmentsError')
    }

}

module.exports = {
    blockSegmentsHandle,
    standardSegmentsHandle
}
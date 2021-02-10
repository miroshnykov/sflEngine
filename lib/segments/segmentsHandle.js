const {
    getBlockSegmentsLocal,
    getStandardSegmentsLocal,
    getLandingPagesLocal
} = require('../../cache/local/segments')
const {resolveSegments} = require('../segments/resloveSegments')
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

            })
            conditionBySegmentReformat.push(conditionBySegment)

        })

        conditionBySegmentReformat = [].concat.apply([], conditionBySegmentReformat)

        // params.conditionBySegmentReformat = conditionBySegmentReformat

        let segmentsResolveOrigin = await resolveSegments(params, conditionBySegmentReformat)

        let segmentsResolve = []
        uniqueSegments.forEach(uniqueSegmentItem => {
            if (segmentsResolveOrigin.length === 0) return
            let foundConditionsBySegment = segmentsResolveOrigin.filter(({segmentId}) => (Number(segmentId) === uniqueSegmentItem.segmentId))
            if (foundConditionsBySegment.length === 0) return
            let checkMatchCondition = 0
            let maximumRulesIndexBySegment = foundConditionsBySegment[0].maximumRulesIndex
            if (params.debug){
                params[`beforeMatchFoundConditionsBySegment-${uniqueSegmentItem.segmentId}`] = foundConditionsBySegment
            }

            foundConditionsBySegment.forEach((condition, key) => {

                let checkingOrAnd = foundConditionsBySegment.filter(item => (item.segmentRuleIndex === key))
                if (checkingOrAnd.length > 0) {
                    checkMatchCondition++
                }
            })

            if (maximumRulesIndexBySegment === checkMatchCondition - 1) {
                segmentsResolve = Object.assign(foundConditionsBySegment)
                // console.log('\nsegmentsResolve:',segmentsResolve)
                // logger.info(` ******* Resolve ${type} Segment:{ ${uniqueSegmentItem.name} } id:{ ${uniqueSegmentItem.segmentId} }`)
            }
            if (params.debug){
                params[`maximumRulesIndexBySegment-${uniqueSegmentItem.segmentId}`] = maximumRulesIndexBySegment
                params[`checkMatchCondition-${uniqueSegmentItem.segmentId}`] = checkMatchCondition-1
            }
        })

        if (segmentsResolve.length !== 0) {
            // logger.info(` ${type}SegmentsResolve count ${segmentsResolve.length}`)
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

            if (params.debug){
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
            if (params.debug){
                params[`${type}SegmentsUrlPreFinalSolved`] = finalRedirectToSegment
                params[`${type}SegmentsPreFinalSolved`] = segmentsResolve
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
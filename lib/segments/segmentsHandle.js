const {
    getBlockSegmentsLocal,
    getStandardSegmentsLocal,
    getLandingPagesLocal
} = require('../../cache/local/segments')
const {resolveSegments} = require('../segments/resloveSegments')
const {v4} = require('uuid')
const {lidSfl} = require('../lid')
const {proportionalDistributionsLP} = require('../utils')
const {createLidAndSendAggrStats} = require('../dynamoDb')
const {redirectUrl} = require('../redirectUrl')

const metrics = require('../../metrics')
const {catchHandler} = require('../../middlewares/catchErr')

const standardSegmentsHandle = async (req, res, params) => {
    try {

        let standardSegments = await getStandardSegmentsLocal() || []
        params.standardSegments = standardSegments
        let standardSegmentsResolve = await resolveSegments(params, standardSegments)
        if (standardSegmentsResolve.length !== 0) {
            console.log(` standardSegmentsResolve count ${standardSegmentsResolve.length}`)
            params.lid = v4()
            params.lidStandardSegment = params.lid
            let lidForSegment = lidSfl(req, params)
            lidForSegment['affiliateId'] = params.affiliateId
            lidForSegment['campaignId'] = params.campaignId
            lidForSegment['programId'] = params.programId
            params.response.standardSegmentsResolve = standardSegmentsResolve[0]

            lidForSegment['segmentId'] = standardSegmentsResolve[0].segmentId
            metrics.influxdb(200, `sflStandardSegmentsResolveSegmentId-${lidForSegment['segmentId']}`)
            params.response.lidForStandardSegment = lidForSegment
            let lp = await getLandingPagesLocal() || []
            let segmentLps = lp.filter(item => item.segmentId === standardSegmentsResolve[0].segmentId)
            params.response.segmentStandardLandingPages = segmentLps

            let resolvLPIndex = proportionalDistributionsLP(segmentLps)
            params.response.resolvLPStandartSegment = resolvLPIndex
            createLidAndSendAggrStats(lidForSegment)

            // res.send(params)

            // let redirectToLP = redirectUrl(req, res, params)
            // res.redirect(resolvLPIndex)
            // params.redirectToLP = redirectToLP
            params.landingPage = resolvLPIndex
            let redirectToStandardSegment = redirectUrl(req, res, params)
            params.solvedStandardSegmentsUrl = redirectToStandardSegment
            params.solvedStandardSegments = standardSegmentsResolve
            return {
                success: true,
                lp: resolvLPIndex
            }
        }

    } catch (e) {
        console.log('standardSegmentsResolveErr:', e)
        catchHandler('standardSegmentsResolve')
    }

}

const blockSegmentsHandle = async (req, res, params) => {
    try {


        let blockSegments = await getBlockSegmentsLocal() || []
        params.blockSegments = blockSegments
        let blockSegmentsResolve = await resolveSegments(params, blockSegments)
        if (blockSegmentsResolve.length !== 0) {
            console.log(` blockSegmentsResolve count ${blockSegmentsResolve.length}`)
            params.lid = v4()
            params.lidBlockSegment = params.lid
            let lidForSegment = lidSfl(req, params)
            lidForSegment['affiliateId'] = params.affiliateId
            lidForSegment['campaignId'] = params.campaignId
            lidForSegment['programId'] = params.programId
            params.response.blockSegmentsResolve = blockSegmentsResolve[0]

            lidForSegment['segmentId'] = blockSegmentsResolve[0].segmentId
            params.response.lidForBlockSegment = lidForSegment
            metrics.influxdb(200, `sflBlockSegmentsResolveSegmentId-${lidForSegment['segmentId']}`)
            let lp = await getLandingPagesLocal() || []
            let segmentLps = lp.filter(item => item.segmentId === blockSegmentsResolve[0].segmentId)
            params.response.segmentBlockLandingPages = segmentLps

            let resolvLPIndex = proportionalDistributionsLP(segmentLps)
            params.response.resolvLPBlockeSegment = resolvLPIndex
            createLidAndSendAggrStats(lidForSegment)

            // res.redirect(resolvLPIndex)
            // res.send(params)
            params.landingPage = resolvLPIndex
            let redirectToBlockSegment = redirectUrl(req, res, params)
            params.solvedblockSegmentsUrl = redirectToBlockSegment
            params.solvedblockSegments = blockSegmentsResolve
            return {
                success: true,
                lp: resolvLPIndex
            }

        }

    } catch (e) {
        console.log('blockSegmentsResolveErr:', e)
        catchHandler('blockSegmentsResolve')
    }

}


module.exports = {
    blockSegmentsHandle,
    standardSegmentsHandle
}
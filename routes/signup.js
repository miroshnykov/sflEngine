const {blockSegmentsHandle, standardSegmentsHandle} = require('../lib/segments/segmentsHandle')
const {sflTargetingHandle} = require('../lib/targeting/targetingHandle')
const {getParams} = require('../lib/params')
const {catchHandler} = require('../middlewares/catchErr')
const metrics = require('../metrics')
const config = require('plain-config')()
const logger = require('bunyan-loader')(config.log).child({scope: 'signup.js'})
const {rangeSpeed} = require('../lib/utils')
// http://localhost:8088/signup?prod=650&ref=5204378&source_type=Sweepstakes&platform=Android&debugging=debugging

// https://sfl-engin.surge.systems/signup?prod=1&ref=5197044&source_type=Sweepstakes&platform=ios1&debugging=debugging
// https://engin.actio.systems/signup?prod=3&ref=5199744&debugging=debugging

// https://sfl-engin-staging.surge.systems/signup?prod=1&ref=5204378&debugging=debugging
const {performance} = require('perf_hooks')

let traffic = {
    signup: async (req, res, next) => {
        try {
            let startTimeSegmentProcessing = performance.now()
            let timeSegmentProcessing
            metrics.influxdb(200, `signup`)

            let params = await getParams(req)
            const debug = params.debugging === `debugging` && true || false

            params.debug = debug
            if (debug) {
                params.response.headers = req.headers
                params.response.ip = req.ip
            }

            // let resultBlockSegments = await blockSegmentsHandle(req, res, params)
            // if (resultBlockSegments && resultBlockSegments.success) {
            //     logger.info(`Resolve BLOCK Segments, segmentId:${resultBlockSegments.segmentId}, LP:${resultBlockSegments.lp}`)
            //     metrics.influxdb(200, `blockSegments`)
            //     params.FinalSolvedBlockedUrl = resultBlockSegments
            //     timeSegmentProcessing = performance.now()
            //     let totalTime = timeSegmentProcessing - startTimeSegmentProcessing
            //     if (rangeSpeed(totalTime) > 900) {
            //         metrics.influxdb(200, `Speed-${rangeSpeed(totalTime)}`)
            //     }
            //     if (!debug) {
            //         res.redirect(resultBlockSegments.lp)
            //         //res.send(params)
            //         return
            //     } else {
            //         res.send(params)
            //         return
            //     }
            //
            // }
            //
            // let resultStandardSegments = await standardSegmentsHandle(req, res, params)
            // if (resultStandardSegments && resultStandardSegments.success) {
            //     logger.info(`Resolve STANDARD Segments, segmentId:${resultStandardSegments.segmentId}, LP:${resultStandardSegments.lp}`)
            //     metrics.influxdb(200, `standardSegments`)
            //     params.FinalSolvedStandardUrl = resultStandardSegments
            //     timeSegmentProcessing = performance.now()
            //     let totalTime = timeSegmentProcessing - startTimeSegmentProcessing
            //     if (rangeSpeed(totalTime) > 900) {
            //         metrics.influxdb(200, `Speed-${rangeSpeed(totalTime)}`)
            //     }
            //     if (!debug) {
            //         res.redirect(resultStandardSegments.lp)
            //         // res.send(params)
            //         return
            //     } else {
            //         res.send(params)
            //         return
            //     }
            //
            // }

            // let resultSflTargeting = await sflTargetingHandle(req, res, params)
            //
            // if (resultSflTargeting && resultSflTargeting.success) {
            //     logger.info(`Resolve SflTargeting, LP:${resultSflTargeting.lp} `)
            //     metrics.influxdb(200, `targeting`)
            //     params.FinalSolvedTargetingUrl = resultSflTargeting
            //     timeSegmentProcessing = performance.now()
            //     let totalTime = timeSegmentProcessing - startTimeSegmentProcessing
            //     if (rangeSpeed(totalTime) > 900) {
            //         metrics.influxdb(200, `Speed-${rangeSpeed(totalTime)}`)
            //     }
            //     if (!debug) {
            //
            //         res.redirect(resultSflTargeting.lp)
            //         // res.send(params)
            //         return
            //     } else {
            //         res.send(params)
            //         return
            //     }
            // }

            // default
            let frlp = config.redirectFlowRotator.url + params.originalUrl
            // params.flowRotatorUrl = frlp
            metrics.influxdb(200, `flowRotator`)
            // params.endTime = new Date() - params.startTime

            params.FinalSolvedFlowRotatorUrl = frlp
            logger.info(`Resolve FLOW ROTATOR, LP: ${frlp}`)
            // logger.info(JSON.stringify(params))
            timeSegmentProcessing = performance.now()
            let totalTime = timeSegmentProcessing - startTimeSegmentProcessing
            if (rangeSpeed(totalTime) > 900) {
                metrics.influxdb(200, `Speed-${rangeSpeed(totalTime)}`)
            }
            if (!debug) {
                res.redirect(frlp)
                return
            } else {
                res.send(params)
                return
            }


        } catch (e) {
            catchHandler(e, 'signupError')
            logger.error(e)
            metrics.influxdb(500, `signup`)
            next(e)
        }
    }
}

module.exports = traffic
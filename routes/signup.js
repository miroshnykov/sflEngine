const {blockSegmentsHandle, standardSegmentsHandle} = require('../lib/segments/segmentsHandle')
const {sflTargetingHandle} = require('../lib/targeting/targetingHandle')
const {getParams} = require('../lib/params')
const {catchHandler} = require('../middlewares/catchErr')
const metrics = require('../metrics')
const config = require('plain-config')()
const logger = require('bunyan-loader')(config.log).child({scope: 'signup.js'})
// http://localhost:8088/signup?prod=650&ref=5204378&source_type=Sweepstakes&platform=Android&debugging=debugging

// https://sfl-engin.surge.systems/signup?prod=1&ref=5197044&source_type=Sweepstakes&platform=ios1&debugging=debugging

// https://sfl-engin-staging.surge.systems/signup?prod=1&ref=5204378&debugging=debugging

let traffic = {
    signup: async (req, res, next) => {
        try {

            metrics.influxdb(200, `signup`)

            let params = await getParams(req)
            const debug = params.debugging === `debugging` && true || false

            if (debug) {
                params.response.headers = req.headers
                params.response.ip = req.ip
            }

            let resultBlockSegments = await blockSegmentsHandle(req, res, params)
            if (resultBlockSegments && resultBlockSegments.success) {
                logger.info(`***************** ResolveBlockSegments, LP:${resultBlockSegments.lp}`)
                if (!debug) {
                    res.redirect(resultBlockSegments.lp)
                    //res.send(params)
                    return
                } else {
                    res.send(params)
                    return
                }

            }

            let resultStandardSegments = await standardSegmentsHandle(req, res, params)
            if (resultStandardSegments && resultStandardSegments.success) {
                logger.info(`***************** ResolveStandardSegments, LP:${resultStandardSegments.lp}`)
                if (!debug) {
                    res.redirect(resultStandardSegments.lp)
                    // res.send(params)
                    return
                } else {
                    res.send(params)
                    return
                }

            }

            let resultSflTargeting = await sflTargetingHandle(req, res, params)

            if (resultSflTargeting && resultSflTargeting.success) {
                logger.info(`***************** Resolve SflTargeting, LP:${resultSflTargeting.lp} `)
                if (!debug) {
                    res.redirect(resultSflTargeting.lp)
                    // res.send(params)
                    return
                } else {
                    res.send(params)
                    return
                }
            }

            // default
            let frlp = config.redirectFlowRotator.url + params.originalUrl
            res.redirect(frlp)

        } catch (e) {
            catchHandler(e, 'signupError')
            logger.error(e)
            metrics.influxdb(500, `signup`)
            next(e)
        }
    }
}

module.exports = traffic
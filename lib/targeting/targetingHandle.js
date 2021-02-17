const {getTargetingLocal} = require('../../cache/local/targeting')
const {checkConditions} = require('../targeting/checkConditions')
const {rangeSpeed} = require('../utils')
const {v4} = require('uuid')
const {lidSfl} = require('../lid')
const {redirectUrl} = require('../redirectUrl')
const {createLid} = require('../dynamoDb')
const config = require('plain-config')()
const metrics = require('../../metrics')
const {catchHandler} = require('../../middlewares/catchErr')
const logger = require('bunyan-loader')(config.log).child({scope: 'targetingHandle.js'})
const {getTargetingEvent} = require('../../cache/localCache')

const sflTargetingHandle = async (req, res, params) => {
    try {
        let findUnderLimit = await getTargetingEvent() || []
        // params.response.findUnderLimit = findUnderLimit

        let find = await checkConditions(findUnderLimit, params.dimensions)

        // params.findTargeting = find

        if (find.length !== 0) {

            params.lid = v4()
            params.landingPage = find.length !== 0 && find[0].landing_page || config.redirectFlowRotator.url + '/signup'
            params.campaignId = find.length !== 0 && find[0].campaignId || 0
            params.targetingId = find.length !== 0 && find[0].targetingId || 0
            params.targetingCpc = find.length !== 0 && find[0].targetingCpc || 0
            let lidObj = lidSfl(req, params)
            lidObj['affiliate_id'] = params.affiliateId
            lidObj['affiliate'] = params.affiliateId
            lidObj['campaign_id'] = params.campaignId
            lidObj['program_id'] = params.programId
            // params.response.lidObj = lidObj
            createLid(lidObj)
            params.affiliate_id = params.affiliateId || 0
            params.campaign_id = params.campaignId || 0
            params.program_id = params.programId || 0
            let redirectToLP = redirectUrl(req, res, params)

            params.response.redirectToLP = redirectToLP
            // console.log(redirectToLPMessage)
            // logger.info(`*******  Find matching dimensions, created LID { ${params.lid} }, details: ${JSON.stringify(params.response)} \n`)

            // res.redirect(redirectToLP)

            // params.endTime = new Date() - params.startTime
            // metrics.influxdb(200, `Speed-SFL-${rangeSpeed(params.endTime)}`)
            // res.send(params)
            return {
                success: true,
                lp: redirectToLP
            }
        }

    } catch (e) {
        logger.error('sflTargetingHandleError:', e)
        catchHandler(e, 'sflTargetingHandleError')
    }

}

module.exports = {
    sflTargetingHandle
}
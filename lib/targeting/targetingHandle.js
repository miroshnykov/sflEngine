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

const sflTargetingHandle = async (req, res, params) => {
    try {
        let findUnderLimit = await getTargetingLocal() || []
        params.response.findUnderLimit = findUnderLimit

        let find = await checkConditions(findUnderLimit, params.dimensions)

        params.findTargeting = find

        if (find.length === 0) {
            let frlp = config.redirectFlowRotator.url + params.originalUrl
            let redirectMessage = `FR URL: { ${frlp} } `
            params.response.FR = redirectMessage
            console.log(` There no dimensions match,  redirect to FR, details: ${JSON.stringify(params.response)} \n`)
            metrics.influxdb(200, `FRLP`)
            // res.redirect(fr)
            // console.timeEnd('signup')
            params.endTime = new Date() - params.startTime

            metrics.influxdb(300, `FR-speed-${rangeSpeed(params.endTime)}`)
            params.redirectToFlowRotator = frlp
            // res.send(params)
            return {
                success: true,
                lp: frlp
            }
        }

        params.lid = v4()
        params.landingPage = find.length !== 0 && find[0].landing_page || 'DefaultLandingPage.com'
        params.campaignId = find.length !== 0 && find[0].campaignId || 0
        params.targetingId = find.length !== 0 && find[0].targetingId || 0
        params.targetingCpc = find.length !== 0 && find[0].targetingCpc || 0
        let lidObj = lidSfl(req, params)
        lidObj['affiliate_id'] = params.affiliateId
        lidObj['affiliate'] = params.affiliateId
        lidObj['campaign_id'] = params.campaignId
        lidObj['program_id'] = params.programId
        params.response.lidObj = lidObj
        createLid(lidObj)
        params.affiliate_id = params.affiliateId || 0
        params.campaign_id = params.campaignId || 0
        params.program_id = params.programId || 0
        let redirectToLP = redirectUrl(req, res, params)

        let redirectToLPMessage = ` redirect to Landing page: { ${redirectToLP} } `
        params.response.redirectToLP = redirectToLPMessage
        // console.log(redirectToLPMessage)
        console.log(` Find matching dimensions, created LID { ${params.lid} }, details: ${JSON.stringify(params.response)} \n`)

        metrics.influxdb(200, `SflLP`)
        // res.redirect(redirectToLP)

        params.endTime = new Date() - params.startTime

        metrics.influxdb(300, `SFL-speed-${rangeSpeed(params.endTime)}`)
        // res.send(params)
        params.redirectToSomeWhere = 'redirectToSomeWhere'
        return {
            success: true,
            lp: redirectToLP
        }

    } catch (e) {
        console.log('sflTargetingHandleError:', e)
        catchHandler('sflTargetingHandleError')
    }

}

module.exports = {
    sflTargetingHandle
}
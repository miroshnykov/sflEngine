let aws = require("aws-sdk")
let DOC = require("dynamodb-doc")
const config = require('plain-config')()
const {getRefCodeInfo} = require('../api/refCode')
const timer = new Date()
const metrics = require('../metrics')

const getLid = async (lid) => {

    try {
        let leadInfo = {};
        leadInfo.Key = {lid: lid};
        leadInfo.TableName = config.dynamodb.tableName

        let awsClient = new aws.DynamoDB(config.dynamodb)
        let docClient = new DOC.DynamoDB(awsClient)
        let res = await docClient.getItem(leadInfo).promise()
        return res.Item
    } catch (e) {
        console.log(e)
        metrics.influxdb(500, `getLidError`)
    }

}

const createLid = async (lidInfo) => {

    try {

        let leadParams = {}
        leadParams.TableName = config.dynamodb.tableName
        // let ref = await getRefCodeInfo(lidInfo.ref)

        let awsClient = new aws.DynamoDB(config.dynamodb)
        let docClient = new DOC.DynamoDB(awsClient)
        let YearPlusOne = new Date(new Date().setFullYear(new Date().getFullYear() + 1))
        lidInfo['ttl'] = YearPlusOne.getTime()
        // lidInfo['affiliate_id'] = ref && ref.affiliate_id || 0
        // lidInfo['affiliate'] = ref && ref.affiliate_id || 0
        // lidInfo['campaign_id'] = ref && ref.campaign_id || 0
        // lidInfo['program_id'] = ref && ref.program_id || 0

        for (const key in lidInfo) {
            if (!lidInfo[key]) {
                delete lidInfo[key]
            }
        }
        let stats = redshiftObj(lidInfo)

        process.send({
            type: 'click',
            value: 1,
            stats: stats
        });

        leadParams.Item = lidInfo
        await docClient.putItem(leadParams).promise()
        metrics.influxdb(200, `createLid`)
        // return lidInfo
    } catch (e) {
        console.log(e)
        metrics.influxdb(500, `createLidError`)
    }

}

const redshiftObj = (lidObj) => (

    {
        'lid': lidObj.lid ,
        'affiliate_id': lidObj.affiliate_id,
        'campaign_id': lidObj.campaign_id,
        'landing_page': lidObj.landingPage,
        'product_id': lidObj.product_id,
        'program_id': lidObj.program_id,
        'unit_price': lidObj.targetingCpc,
        'sflCampaignId': lidObj.campaignId,
        'sflTargetingCpc': lidObj.targetingCpc,
        'date_added': timer.getTime(),
        'event_type': 'click',
        'click': 1,
        'geo': lidObj.country,
        'dimensions': 'dimensionsExample',

    }
)

module.exports = {
    getLid,
    createLid
}
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
        leadInfo.TableName = config.aws.dynamodb_tableName


        let dynamoDbConf = {}
        dynamoDbConf.region = config.aws.dynamodb_region
        dynamoDbConf.endpoint = config.aws.dynamodb_endpoint
        dynamoDbConf.accessKeyId = config.aws.access_key
        dynamoDbConf.secretAccessKey = config.aws.secret_key
        dynamoDbConf.tableName = config.aws.dynamodb_tableName

        let awsClient = new aws.DynamoDB(dynamoDbConf)
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
        leadParams.TableName = config.aws.dynamodb_tableName
        // let ref = await getRefCodeInfo(lidInfo.ref)

        let dynamoDbConf = {}
        dynamoDbConf.region = config.aws.dynamodb_region
        dynamoDbConf.endpoint = config.aws.dynamodb_endpoint
        dynamoDbConf.accessKeyId = config.aws.access_key
        dynamoDbConf.secretAccessKey = config.aws.secret_key
        dynamoDbConf.tableName = config.aws.dynamodb_tableName
        let awsClient = new aws.DynamoDB(dynamoDbConf)
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

const createLidOffer = async (lidInfo) => {

    try {

        let leadParams = {}
        leadParams.TableName = config.aws.dynamodb_tableName

        let dynamoDbConf = {}
        dynamoDbConf.region = config.aws.dynamodb_region
        dynamoDbConf.endpoint = config.aws.dynamodb_endpoint
        dynamoDbConf.accessKeyId = config.aws.access_key
        dynamoDbConf.secretAccessKey = config.aws.secret_key
        dynamoDbConf.tableName = config.aws.dynamodb_tableName

        let awsClient = new aws.DynamoDB(dynamoDbConf)
        let docClient = new DOC.DynamoDB(awsClient)
        let YearPlusOne = new Date(new Date().setFullYear(new Date().getFullYear() + 1))
        lidInfo['ttl'] = YearPlusOne.getTime()

        for (const key in lidInfo) {
            if (!lidInfo[key]) {
                delete lidInfo[key]
            }
        }
        let stats = redshiftOffer(lidInfo)

        process.send({
            type: 'clickOffer',
            value: 1,
            stats: stats
        });

        // console.log('CREATE LID:',lidInfo)
        leadParams.Item = lidInfo
        await docClient.putItem(leadParams).promise()
        metrics.influxdb(200, `createLidOffer`)
        // return lidInfo
    } catch (e) {
        console.log(e)
        metrics.influxdb(500, `createLidOfferError`)
    }

}

const createLidAndSendAggrStats = async (lidInfo) => {

    try {

        let leadParams = {}
        leadParams.TableName = config.aws.dynamodb_tableName

        let dynamoDbConf = {}
        dynamoDbConf.region = config.aws.dynamodb_region
        dynamoDbConf.endpoint = config.aws.dynamodb_endpoint
        dynamoDbConf.accessKeyId = config.aws.access_key
        dynamoDbConf.secretAccessKey = config.aws.secret_key
        dynamoDbConf.tableName = config.aws.dynamodb_tableName

        let awsClient = new aws.DynamoDB(dynamoDbConf)
        let docClient = new DOC.DynamoDB(awsClient)
        let YearPlusOne = new Date(new Date().setFullYear(new Date().getFullYear() + 1))
        lidInfo['ttl'] = YearPlusOne.getTime()

        for (const key in lidInfo) {
            if (!lidInfo[key]) {
                if (key !== 'is_override') {
                    delete lidInfo[key]
                }
            }
        }

        let stats = redshiftAggrStats(lidInfo)
        // console.log(stats)
        process.send({
            type: 'clickAggrStats',
            value: 1,
            stats: stats
        });

        leadParams.Item = lidInfo
        await docClient.putItem(leadParams).promise()
        metrics.influxdb(200, `createLidAndSendAggrStats`)
        // return lidInfo
    } catch (e) {
        console.log(e)
        metrics.influxdb(500, `createLidAndSendAggrStatsError`)
    }

}

const redshiftObj = (lidObj) => (

    {
        'lid': lidObj.lid,
        'affiliate_id': lidObj.affiliate_id || 0,
        'campaign_id': lidObj.campaign_id || 0,
        'landing_page': lidObj.landingPage || 0,
        'product_id': lidObj.product_id || 0,
        'program_id': lidObj.program_id || 0,
        'unit_price': lidObj.targetingCpc || 0,
        'sflCampaignId': lidObj.campaignId || 0,
        'sflTargetingCpc': lidObj.targetingCpc || 0,
        'date_added': timer.getTime(),
        'event_type': 'click',
        'click': 1,
        'geo': lidObj.country,
        'dimensions': 'dimensionsExample',

    }
)

const redshiftOffer = (lidObj) => (

    {
        'lid': lidObj.lid,
        'affiliate_id': +lidObj.affiliateId || 0,
        'campaign_id': +lidObj.campaignId || 0,
        'offer_id': +lidObj.offerId || 0,
        'landing_page': lidObj.landingPage || '',
        'landing_page_id': +lidObj.landingPageId || 0,
        'payin': lidObj.payin || 0,
        'payout': lidObj.payout || 0,
        'geo': lidObj.country || '',
        'cap_override_offer_id': lidObj.capOverrideOfferId || 0,
        'landing_page_id_origin': lidObj.landingPageIdOrigin || 0,
        'advertiser': lidObj.advertiserId || '',
        'verticals': lidObj.verticalId || '',
        'conversion_type': lidObj.conversionType || '',
        'date_added': timer.getTime(),
        'click': 1,

    }
)

const redshiftAggrStats = (lidObj) => (

    {
        'lid': lidObj.lid,
        'affiliate_id': +lidObj.affiliate_id || 0,
        'campaign_id': +lidObj.campaign_id || 0,
        'product_id': +lidObj.product_id || 0,
        'program_id': +lidObj.program_id || 0,
        'sub_campaign': lidObj.sub_campaign || '',
        'os': lidObj.os || '',
        'browser': lidObj.browser || '',
        'geo': lidObj.country || '',
        'click': 1,
        'visit': 1,
        'unique_visit': lidObj.unique_visit || 1,
        '_messageType': 'aggregator_stat',
        'event_type': 'click',
        'event_count': 1,
        'account_executive_id': lidObj.account_executive_id || 0,
        'account_manager_id': lidObj.account_manager_id || 0,
        'affiliate_type': lidObj.affiliate_type || '',
        'referer_domain': lidObj.refererDomain || '',
        'referer_path': `${lidObj.refererPath || ''}||debug||segmentType-${lidObj.segmentType}`,
        'segment_id': lidObj.segment_id || 0
    }
)

module.exports = {
    getLid,
    createLid,
    createLidOffer,
    createLidAndSendAggrStats
}
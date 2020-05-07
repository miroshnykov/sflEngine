let aws = require("aws-sdk")
let DOC = require("dynamodb-doc")
const config = require('plain-config')()

const {getRefCodeInfo} = require('../api/refCode')

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
    }

}

const createLid = async (lidInfo) => {

    try {
        let leadParams = {}
        leadParams.TableName = config.dynamodb.tableName
        let ref = await getRefCodeInfo(lidInfo.ref)

        let awsClient = new aws.DynamoDB(config.dynamodb)
        let docClient = new DOC.DynamoDB(awsClient)
        let YearPlusOne = new Date(new Date().setFullYear(new Date().getFullYear() + 1))
        lidInfo['ttl'] = YearPlusOne.getTime()
        lidInfo['affiliateId'] = ref.affiliate_id || 0

        for (const key in lidInfo) {
            if (!lidInfo[key]) {
                delete lidInfo[key]
            }
        }

        leadParams.Item = lidInfo
        let res = await docClient.putItem(leadParams).promise()
        console.log(res)
        return lidInfo.lid
    } catch (e) {
        console.log(e)
    }

}


module.exports = {
    getLid,
    createLid
}
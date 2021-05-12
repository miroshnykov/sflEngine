const config = require('plain-config')()
const axios = require('axios')
const logger = require('bunyan-loader')(config.log).child({scope: 'refCode.js'})
const metrics = require('../metrics')

const refCodeRequest = axios.create({
    baseURL: config.affiliateApi.host,
    timeout: 10000
})

const getRefCodeInfo = async (refCode) => {

    // logger.info(`*** Get refcode:${refCode} from API`)
    try {
        let {data} = await refCodeRequest.get( `/api/getRefCodeInfo?ref_code=${refCode}`)
        return data

    } catch(e) {
        logger.error('*** Not able to parse refCodeInfo from api, use default ')
        metrics.influxdb(500, `getRefCodeInfoError`)
    }
}

module.exports = {
    getRefCodeInfo
}
const config = require('plain-config')()
const axios = require('axios')

const logger = require('bunyan-loader')(config.log).child({scope: 'refCodesInfo.js'})

const md5 = require('md5')
const metrics = require('../metrics')

const refCodeInfoRequest = axios.create({
    baseURL: config.sflApi.host,
    timeout: 10000
})
const {catchHandler} = require('../middlewares/catchErr')

const getRefCodeInfo_ = async (apiInputData) => {

    let secret = config.sflApi.secret
    let timestamp = Date.now()
    let hash = md5(`${timestamp}|${secret}`)

    try {
        let url = `/refcode?ref=${apiInputData.ref}&prod=${apiInputData.prod}&timestamp=${timestamp}&hash=${hash}`
        let {data} = await refCodeInfoRequest.get(url)
        logger.info(` ***** GetRefCodeInfoData:${JSON.stringify(data)}` )
        return data

    } catch(e) {
        catchHandler(e, 'Not able to parse refCodeInfo from sfl-api, use default')
        metrics.influxdb(500, `getRefCodeInfoError`)
    }
}

module.exports = {
    getRefCodeInfo_
}
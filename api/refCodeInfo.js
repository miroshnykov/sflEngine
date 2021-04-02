const config = require('plain-config')()
const axios = require('axios')

const md5 = require('md5')
const metrics = require('../metrics')

const refCodeInfoRequest = axios.create({
    baseURL: config.sflApi.host,
    timeout: 10000
})

const getRefCodeInfo_ = async (apiInputData) => {

    let secret = config.sflApi.secret
    let timestamp = Date.now()
    let hash = md5(`${timestamp}|${secret}`)

    try {
        let url = `/refcode?ref=${apiInputData.ref}&prod=${apiInputData.prod}&timestamp=${timestamp}&hash=${hash}`
        let {data} = await refCodeInfoRequest.get(url)
        console.log(`getRefCodeInfoData:${JSON.stringify(data)}` )
        // console.log(url)
        // console.log('data:',data)
        return data

    } catch(e) {
        console.log('*** Not able to parse refCodeInfo from sfl-api, use default', e)
        metrics.influxdb(500, `getRefCodeInfoError`)
    }
}

module.exports = {
    getRefCodeInfo_
}
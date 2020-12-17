const config = require('plain-config')()
const axios = require('axios')
const {catchHandler} = require('../../middlewares/catchErr')
const metrics = require('../../metrics')

// console.log(` call to coreCache host:${config.cacheEngine.host}getProductsBuckets to get ProductsBucketsLocal every 5 min`)
const sflCoreCacheRequest = axios.create({
    baseURL: config.cacheEngine.host,
})

const getProductsBucketsApi = async () => {
    try {
        // console.log(`*** call endpoint to get DATA ${config.cacheEngine.host}getTargeting`)
        const {data} = await sflCoreCacheRequest.get(`getProductsBuckets`)
        // console.log('getTargetingApi:',data)
        return data
    } catch (e) {
        catchHandler(e, 'getTargeting')
        metrics.influxdb(500, `getProductsBucketsApiError`)
    }

}

module.exports = {
    getProductsBucketsApi
}
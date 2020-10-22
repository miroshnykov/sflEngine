const config = require('plain-config')()
const axios = require('axios')
const {catchHandler} = require('../../middlewares/catchErr')
const metrics = require('../../metrics')

console.log(` call to coreCache host:${config.cacheEngine.host}getTargeting to get targeting every 5 min`)
const sflCoreCacheRequest = axios.create({
    baseURL: config.cacheEngine.host,
})

const getTargetingApi = async () => {
    try {
        // console.log(`*** call endpoint to get DATA ${config.cacheEngine.host}getTargeting`)
        const {data} = await sflCoreCacheRequest.get(`getTargeting`)
        return data
    } catch (e) {
        catchHandler(e, 'getTargetingError')
        metrics.influxdb(500, `getTargetingError`)
    }

}

module.exports = {
    getTargetingApi
}
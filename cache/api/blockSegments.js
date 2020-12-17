const config = require('plain-config')()
const axios = require('axios')
const {catchHandler} = require('../../middlewares/catchErr')
const metrics = require('../../metrics')

// console.log(` call to coreCache host:${config.cacheEngine.host}getTargeting to get targeting every 5 min`)
const sflCoreCacheRequest = axios.create({
    baseURL: config.cacheEngine.host,
})

const getBlockSegmentsApi = async () => {
    try {
        // console.log(`*** call endpoint to get DATA ${config.cacheEngine.host}getBlockSegments`)
        const {data} = await sflCoreCacheRequest.get(`getBlockSegments`)
        return data
    } catch (e) {
        catchHandler(e, 'getBlockSegmentsApiError')
        metrics.influxdb(500, `getBlockSegmentsApiError`)
    }

}

const getLandingPagesApi = async () => {
    try {
        // console.log(`*** call endpoint to get DATA ${config.cacheEngine.host}getTargeting`)
        const {data} = await sflCoreCacheRequest.get(`getLps`)
        return data
    } catch (e) {
        catchHandler(e, 'getLandingPagesApiError')
        metrics.influxdb(500, `getLandingPagesApiError`)
    }

}

module.exports = {
    getBlockSegmentsApi,
    getLandingPagesApi
}
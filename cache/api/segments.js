const config = require('plain-config')()
const axios = require('axios')
const {catchHandler} = require('../../middlewares/catchErr')
const metrics = require('../../metrics')

//   ************ deprecated sfl-cache , getting data from sfl-offers
// console.log(` call to coreCache host:${config.cacheEngine.host}getTargeting to get targeting every 5 min`)
const sflCoreCacheRequest = axios.create({
    baseURL: config.cacheEngine.host,
})

const getSegmentsApi = async () => {
    try {
        // console.log(`*** call endpoint to get DATA ${config.cacheEngine.host}getSegments`)
        const {data} = await sflCoreCacheRequest.get(`getSegments`)
        return data
    } catch (e) {
        catchHandler(e, 'getSegmentsApiError')
        metrics.influxdb(500, `getSegmentsApiError`)
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
    getSegmentsApi,
    getLandingPagesApi
}
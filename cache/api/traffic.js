const config = require('plain-config')()
const axios = require('axios')
const {catchHandler} = require('../../middlewares/catchErr')
const metrics = require('../../metrics')
console.log(` call to coreCache host:${config.cacheEngine.host} to get budget by campaign`)
const sflCoreCacheRequest = axios.create({
    baseURL: config.cacheEngine.host,
})

const getBudgetStatusByCampaign = async (campaignId) => {
    try {
        console.log(`*** call endpoint to get DATA ${config.cacheEngine.host} getBudgetStatusByCampaign?campaignId=${campaignId}`)
        const {data} = await sflCoreCacheRequest.get(`getBudgetStatusByCampaign?campaignId=${campaignId}`)
        return data
    } catch (e) {
        catchHandler(e, 'getBudgetStatusByCampaign')
        metrics.influxdb(500, `getBudgetStatusByCampaignError`)
        return []
    }

}

const getConditionUnderLimit = async () => {
    try {
        // console.log(`*** call endpoint to get DATA ${config.cacheEngine.host} getConditionUnderLimit`)
        const {data} = await sflCoreCacheRequest.get(`getConditionUnderLimit`)
        return data
    } catch (e) {
        catchHandler(e, 'getConditionUnderLimit')
        metrics.influxdb(500, `getConditionUnderLimitError`)
        return []
    }

}

const addClick = async (campaignId, clickCount, cpc) => {
    try {

        let obj = {}
        obj.campaignId = campaignId
        obj.clickCount = clickCount
        obj.cpc = cpc

        let params = {
            method: 'POST',
            url: `addClick`,
            data: obj

        }

        console.log(`sendClick before send, data: ${JSON.stringify(params)}`)
        const {data} = await sflCoreCacheRequest(params)
        metrics.influxdb(200, `addClick`)
        return data
    } catch (e) {
        catchHandler(e, 'addClick')
        metrics.influxdb(500, `addClickError`)
    }

}

module.exports = {
    getBudgetStatusByCampaign,
    addClick,
    getConditionUnderLimit
}
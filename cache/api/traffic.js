const config = require('plain-config')()
const axios = require('axios')
const {catchHandler} = require('../../middlewares/catchErr')

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
        return []
    }

}

const getConditionUnderLimit = async () => {
    try {
        console.log(`*** call endpoint to get DATA ${config.cacheEngine.host} getConditionUnderLimit`)
        const {data} = await sflCoreCacheRequest.get(`getConditionUnderLimit`)
        return data
    } catch (e) {
        catchHandler(e, 'getConditionUnderLimit')
        return []
    }

}

const addClick = async (campaignId, clickCount) => {
    try {
        console.log(`*** call endpoint to get DATA ${config.cacheEngine.host}getTargeting`)
        let obj = {}
        obj.campaignId = campaignId
        obj.clickCount = clickCount

        let params = {
            method: 'POST',
            url: `addClick`,
            data: obj

        }

        console.log(`\n **** sendClick  before send, data: ${JSON.stringify(params)}`)
        const {data} = await sflCoreCacheRequest(params)
        return data
    } catch (e) {
        catchHandler(e, 'addClick')
    }

}

module.exports = {
    getBudgetStatusByCampaign,
    addClick,
    getConditionUnderLimit
}
const config = require('plain-config')()
const axios = require('axios')
const Base64 = require('js-base64').Base64
const {catchHandler} = require('../middlewares/catchErr')

const metrics = require('../metrics')

const aggrRequest = axios.create({
    baseURL: config.aggragatorApi.host,
})

const sendToAggr = async (stats) => {

    try {
        let statsClone = Object.assign({}, stats)
        delete statsClone.sflCampaignId
        delete statsClone.sflTargetingCpc
        // console.log(`config.aggragatorApi:`, config.aggragatorApi)
        let timer = new Date()
        let obj = {}
        obj.key = Base64.encode(JSON.stringify(statsClone))
        obj.event = stats.event_type
        obj.time = timer.getTime()
        obj.count = 1

        let params = {
            method: 'POST',
            url: `sfl`,
            data: obj
        }

        console.log(`send to aggr before send, data: ${JSON.stringify(params)}`)
        const {data} = await aggrRequest(params)
        metrics.influxdb(200, `aggregator`)
        return data

    } catch (e) {
        catchHandler(e, 'aggregatorError')
        metrics.influxdb(500, `aggregatorError`)
    }
}

const sendToAggrOffer = async (stats) => {

    try {
        let statsClone = Object.assign({}, stats)
        let timer = new Date()
        let obj = {}
        obj.key = Base64.encode(JSON.stringify(statsClone))
        obj.event = stats.event_type
        obj.time = timer.getTime()
        obj.count = 1

        let params = {
            method: 'POST',
            url: `sfloffer`,
            data: obj
        }

        console.log(`send to aggr before send, data: ${JSON.stringify(params)}`)
        const {data} = await aggrRequest(params)
        metrics.influxdb(200, `aggregatorSflOffer`)
        return data

    } catch (e) {
        catchHandler(e, 'aggregatorSflOfferError')
        metrics.influxdb(500, `aggregatorSflOfferError`)
    }
}

module.exports = {
    sendToAggr,
    sendToAggrOffer
}
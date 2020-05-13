const config = require('plain-config')()
const axios = require('axios')
const Base64 = require('js-base64').Base64
const {catchHandler} = require('../middlewares/catchErr')

const timer = new Date()

const aggrRequest = axios.create({
    baseURL: config.aggragatorApi.host,
})

const sendToAggr = async (stats) => {

    try {

        let obj = {}
        obj.key = Base64.encode(JSON.stringify(stats))
        obj.event = stats.event_type
        obj.time = timer.getTime()
        obj.count = 1

        let params = {
            method: 'POST',
            url: `sfl`,
            data: obj
        }

        console.log(`\n      ***** send to aggr before send, data: ${JSON.stringify(params)}`)
        const {data} = await aggrRequest(params)
        return data

    } catch (e) {
        console.log('*** Not able to send to aggr  ')
        catchHandler(e, 'sendToAggr')
    }
}

module.exports = {
    sendToAggr
}
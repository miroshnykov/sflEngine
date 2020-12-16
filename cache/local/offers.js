const {catchHandler} = require('../../middlewares/catchErr')
const {getDataCache, setDataCache, delDataCache} = require('../redis')
const {getTargetingApi} = require('../api/targeting')
const metrics = require('../../metrics')
const zlib = require('zlib')
const fs = require('fs')
const JSONStream = require("JSONStream")
const config = require('plain-config')()

const sqsProcessing = async (message) => {

    try {
        if (message.action === 'insert') {
            await setData(`${message.type}-${message.id}`, message.body)
        }
        if (message.action === 'delete') {
            await delData(`${message.type}-${message.id}`)
        }
    } catch (e) {
        catchHandler(e, 'sqsProcessingError')
        metrics.influxdb(500, `sqsProcessingError`)
    }
}

const setOffers = async () => {

    try {
        // console.time('setOffersInsertSpeed')
        let gunzip = zlib.createGunzip();
        // let campaignsFile = config.sflOffer.recipeFolderCampaigns
        let file = config.sflOffer.recipeFolderOffers
        console.log('sflOffer config:', config.sflOffer)
        if (!file){
            console.log(' no recipe file offer')
            return
        }
        let stream = fs.createReadStream(file)
        console.log('file:', file)
        let jsonStream = JSONStream.parse('*')
        stream.pipe(gunzip).pipe(jsonStream)
        jsonStream.on('data', async (item) => {
            await setDataCache(`offer-${item.offerId}`, item)
        })

        // jsonStream.on('end', async () => {
        //     console.log('offer end')
        // })

    } catch (e) {
        catchHandler(e, 'setOffersError')
        metrics.influxdb(500, `setOffersError`)
    }
}

const setData = async (key, body) => {

    try {
        console.log(`setData key:${key}:`, body)
        await setDataCache(key, JSON.parse(body))

    } catch (e) {
        catchHandler(e, 'setDataError')
        metrics.influxdb(500, `setDataError`)
    }
}

const getData = async (key) => {

    try {
        console.log('getData:', key)
        return await getDataCache(`${key}`)

    } catch (e) {
        catchHandler(e, 'getDataError')
        metrics.influxdb(500, `getDataError`)
    }
}

const delData = async (key) => {

    try {

        console.log('delData:', key)
        await delDataCache(`${key}`)

    } catch (e) {
        catchHandler(e, 'delDataError')
        metrics.influxdb(500, `delDataError`)
    }
}

const setCampaigns = async () => {

    try {
        // console.time('setCampaignsInsertSpeed')
        let gunzip = zlib.createGunzip();
        let file = config.sflOffer.recipeFolderCampaigns
        console.log('sflOffer config:', config.sflOffer)
        if (!file){
            console.log('no recipe file campaign')
            return
        }
        let stream = fs.createReadStream(file)
        let jsonStream = JSONStream.parse('*')
        stream.pipe(gunzip).pipe(jsonStream)
        jsonStream.on('data', async (item) => {
            await setDataCache(`campaign-${item.campaignId}`, item)
        })

        // jsonStream.on('end', () => {
        //     console.log('campaigns end')
        // })


    } catch (e) {
        catchHandler(e, 'setCampaignsError')
        metrics.influxdb(500, `setCampaignsError`)
    }
}


module.exports = {
    setOffers,
    setCampaigns,
    getData,
    sqsProcessing

}


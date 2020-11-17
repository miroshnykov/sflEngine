const {catchHandler} = require('../../middlewares/catchErr')
const {getDataCache, setDataCache} = require('../redis')
const {getTargetingApi} = require('../api/targeting')
const metrics = require('../../metrics')
const zlib = require('zlib')
const fs = require('fs')
const JSONStream = require("JSONStream")
const config = require('plain-config')()

const getOffer = async (id) => {

    try {
        return await getDataCache(`offer-${id}`)
    } catch (e) {
        catchHandler(e, 'getOfferError')
        // metrics.influxdb(500, `getOfferError`)
    }
}

const getCampaign = async (id) => {

    try {
        return await getDataCache(`campaigns-${id}`)

    } catch (e) {
        catchHandler(e, 'getCampaignError')
        // metrics.influxdb(500, `getCampaignError`)
    }
}


const setOffers = async () => {

    try {
        console.time('setOffersInsertSpeed')
        let gunzip = zlib.createGunzip();
        // let campaignsFile = config.sflOffer.recipeFolderCampaigns
        let stream = fs.createReadStream(config.sflOffer.recipeFolderOffers)
        let jsonStream = JSONStream.parse('*')
        stream.pipe(gunzip).pipe(jsonStream)
        jsonStream.on('data', async (item) => {
            await setDataCache(`offer-${item.offerId}`, item)
        })

        jsonStream.on('end', () => {
            console.log('done')
            console.timeEnd('setOffersInsertSpeed')
        })

    } catch (e) {
        catchHandler(e, 'setOffersError')
        // metrics.influxdb(500, `setOffersError`)
    }
}

const setCampaigns = async () => {

    try {
        console.time('setCampaignsInsertSpeed')
        let gunzip = zlib.createGunzip();
        let file = config.sflOffer.recipeFolderCampaigns
        console.log('file:', file)
        let stream = fs.createReadStream(file)
        let jsonStream = JSONStream.parse('*')
        stream.pipe(gunzip).pipe(jsonStream)
        jsonStream.on('data', async (item) => {
            await setDataCache(`campaigns-${item.campaignId}`, item)
        })

        jsonStream.on('end', () => {
            console.log('done')
            console.timeEnd('setCampaignsInsertSpeed')
        })

    } catch (e) {
        catchHandler(e, 'setCampaignsError')
        // metrics.influxdb(500, `setCampaignsError`)
    }
}


module.exports = {
    setOffers,
    setCampaigns,
    getOffer,
    getCampaign
}


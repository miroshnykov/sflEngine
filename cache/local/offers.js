const {catchHandler} = require('../../middlewares/catchErr')
const {getDataCache, setDataCache, delDataCache, getKeysCache} = require('../redis')
const metrics = require('../../metrics')
const zlib = require('zlib')
const fs = require('fs')
const JSONStream = require("JSONStream")
const config = require('plain-config')()
const logger = require('bunyan-loader')(config.log).child({scope: 'offers.js'})
const os = require('os')
const hostname = os.hostname()
const {getFileSize} = require('./../../lib/utils')

const sqsProcessing = async (message) => {

    logger.info(`got SQS message: ${JSON.stringify(message)} `)
    try {
        if (message.action === 'insert') {
            await setData(`${message.type}-${message.id}`, message.body)
            metrics.influxdb(200, `sqsMessage-insert`)
        }
        if (message.action === 'delete') {
            await delData(`${message.type}-${message.id}`)
            metrics.influxdb(200, `sqsMessage-delete`)
        }
    } catch (e) {
        catchHandler(e, 'sqsProcessingError')
        metrics.influxdb(500, `sqsProcessingError`)
    }
}

const setOffers = async () => {

    try {

        let file = config.recipe.offers
        let fileSizeInfo_ = await getDataCache('fileSizeInfo_')
        if (!fileSizeInfo_) {
            logger.info(`Offer not define size in redis`)
            return
        }
        let size = getFileSize(file) || 0
        logger.info(`fileSizeInfo_.offer:${fileSizeInfo_.offer}, Size from file Offers:${size}`)

        if (size === fileSizeInfo_.offer) {
            logger.info(`Size of OFFERS the same lets add to redis  `)
        } else {
            logger.info(`Size of recipe file OFFERS is different, need to reSend file from sfl-offer`)
            metrics.influxdb(200, `fileDifferentOffer_-${hostname}`)
            return
        }

        let offers = await getKeysCache('offer-*')
        // console.log('offers count:',offers.length)
        for (const offer of offers) {
            await delDataCache(offer)
        }

        // console.time('setOffersInsertSpeed')
        let gunzip = zlib.createGunzip();
        // let campaignsFile = config.recipe.offers
        // console.log(`sflOffer config:${JSON.stringify(config.sflOffer)}`)
        if (!file) {
            console.log(' no recipe file offer')
            return
        }
        let stream = fs.createReadStream(file)
        // console.log('file:', file)
        let jsonStream = JSONStream.parse('*')
        stream.pipe(gunzip).pipe(jsonStream)
        jsonStream.on('data', async (item) => {
            if (!item.offerId) {
                metrics.influxdb(500, `setOffersEmpty`)
                return
            }
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
        // console.log(`setData key:${key}:`, body)
        await setDataCache(key, JSON.parse(body))

    } catch (e) {
        catchHandler(e, 'setDataError')
        metrics.influxdb(500, `setDataError`)
    }
}

const getData = async (key) => {

    try {
        // console.log('getData:', key)
        return await getDataCache(`${key}`)

    } catch (e) {
        catchHandler(e, 'getDataError')
        metrics.influxdb(500, `getDataError`)
    }
}

const delData = async (key) => {

    try {

        // console.log('delData:', key)
        await delDataCache(`${key}`)

    } catch (e) {
        catchHandler(e, 'delDataError')
        metrics.influxdb(500, `delDataError`)
    }
}

const setCampaigns = async () => {

    try {
        let file = config.recipe.campaigns

        let fileSizeInfo_ = await getDataCache('fileSizeInfo_')
        if (!fileSizeInfo_) {
            logger.info(`Campaign not define size in redis`)
            return
        }
        let size = getFileSize(file) || 0

        logger.info(`fileSizeInfo_campaigns:${fileSizeInfo_.campaign}, Size from file Campaigns:${size}`)
        if (size === fileSizeInfo_.campaign) {
            logger.info(`Size the same lets add to redis  `)
        } else {
            logger.info(`Size of recipe file campaigns is different , need to reSend file from sfl-offer`)
            metrics.influxdb(200, `fileDifferentCampaigns_-${hostname}`)
            return
        }

        let campaigns = await getKeysCache('campaign-*')
        // console.log('campaigns count:',campaigns.length)

        for (const campaign of campaigns) {
            await delDataCache(campaign)
        }

        // console.time('setCampaignsInsertSpeed')
        let gunzip = zlib.createGunzip();

        // console.log('sflOffer config:', config.sflOffer)
        if (!file) {
            console.log('no recipe file campaign')
            return
        }
        let stream = fs.createReadStream(file)
        let jsonStream = JSONStream.parse('*')
        stream.pipe(gunzip).pipe(jsonStream)
        jsonStream.on('data', async (item) => {
            if (!item.campaignId) {
                metrics.influxdb(500, `setCampaignsEmpty`)
                return
            }
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


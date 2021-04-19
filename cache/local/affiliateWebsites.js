const {catchHandler} = require('../../middlewares/catchErr')
const {setDataCache} = require('../redis')
const metrics = require('../../metrics')
const zlib = require('zlib')
const fs = require('fs')
const JSONStream = require("JSONStream")
const config = require('plain-config')()
const {getDataCache, getKeysCache, delDataCache} = require('../redis')

const os = require('os')
const hostname = os.hostname()
const {getFileSize} = require('./../../lib/utils')
const logger = require('bunyan-loader')(config.log).child({scope: 'affiliateWebsites.js'})

let affiliateWebsitesWorker = {}

const getAffiliatesWebsitesWorker = () => {
    return affiliateWebsitesWorker
}
const getAffiliatesWebsitesWorkerById = (affiliateId) => {
    return affiliateWebsitesWorker && affiliateWebsitesWorker[affiliateId]
}

const setAffiliateWebsites = async () => {

    try {
        let file = config.recipe.affiliateWebsites
        let fileSizeInfo_ = await getDataCache('fileSizeInfo_')
        if (!fileSizeInfo_) {
            logger.info(`affiliateWebsites not define size in redis`)
            return
        }
        let size = await getFileSize(file) || 0
        logger.info(`fileSizeInfo_.affiliateWebsitesr:${fileSizeInfo_.affiliateWebsites}, Size from file affiliateWebsites:${size}`)
        if (size === fileSizeInfo_.affiliateWebsites) {
            logger.info(`Size of affiliateWebsites the same lets add to redis  `)
        } else {
            logger.info(`Size of recipe file affiliateWebsites is different, need to reSend file from sfl-offer`)
            metrics.influxdb(200, `FileDifferentAffiliateWebsites-${hostname}`)
            return
        }

        let affiliateWebsites = await getKeysCache('affiliateWebsites-*')
        // console.log('affiliateWebsites count:',affiliateWebsites.length)
        for (const affiliateWebsite of affiliateWebsites) {
            await delDataCache(affiliateWebsite)
        }

        let gunzip = zlib.createGunzip();

        let stream = fs.createReadStream(file)
        let jsonStream = JSONStream.parse('*')
        affiliateWebsitesWorker = {}
        stream.pipe(gunzip).pipe(jsonStream)
        jsonStream.on('data', async (item) => {
            if (!item.affiliateId) {
                metrics.influxdb(500, `setAffiliateWebsitesEmpty-${hostname}`)
                return
            }
            await setDataCache(`affiliateWebsites-${item.affiliateId}`, item)
            affiliateWebsitesWorker[item.affiliateId] = JSON.parse(item.sites)
            // console.log('affiliateWebsitesWorker:', affiliateWebsitesWorker)
        })

    } catch (e) {
        catchHandler(e, 'setAffiliateWebsitesError')
        metrics.influxdb(500, `setAffiliateWebsitesError`)
    }
}


module.exports = {
    setAffiliateWebsites,
    getAffiliatesWebsitesWorker,
    getAffiliatesWebsitesWorkerById
}


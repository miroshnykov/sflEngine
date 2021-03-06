const {catchHandler} = require('../../middlewares/catchErr')
const {getDataCache, setDataCache, delDataCache, getKeysCache} = require('../redis')
const metrics = require('../../metrics')
const zlib = require('zlib')
const fs = require('fs')
const JSONStream = require("JSONStream")
const config = require('plain-config')()
const {getFileSize} = require('./../../lib/utils')
const logger = require('bunyan-loader')(config.log).child({scope: 'affiliates.js'})
const os = require('os')
const computerName = os.hostname()

let affiliatesWorker = {}

const getAffiliatesWorker = () => {
    return affiliatesWorker
}
const getAffiliatesWorkerById = (affiliateId) => {
    return affiliatesWorker && affiliatesWorker[affiliateId]
}

const setAffiliates = async () => {

    try {

        let file = config.recipe.affiliates
        let fileSizeInfo_ = await getDataCache('fileSizeInfo_')
        if (!fileSizeInfo_) {
            logger.info(`Affiliates not define size in redis `)
            return
        }
        let size = await getFileSize(file) || 0
        logger.info(`fileSizeInfo_.affiliates:${fileSizeInfo_.affiliates}, Size from file affiliates:${size}`)
        if (size === fileSizeInfo_.affiliates) {
            logger.info(`Size of affiliates the same lets add to redis  `)
        } else {
            logger.info(`Size of recipe file affiliates is different, need to reSend file from sfl-offer`)
            metrics.influxdb(200, `FileDifferentAffiliates-${computerName}`)
            return
        }

        let affiliates = await getKeysCache('affiliate-*')
        for (const affiliate of affiliates) {
            await delDataCache(affiliate)
        }

        let gunzip = zlib.createGunzip();

        let stream = fs.createReadStream(file)
        affiliatesWorker = {}
        let jsonStream = JSONStream.parse('*')
        stream.pipe(gunzip).pipe(jsonStream)
        jsonStream.on('data', async (item) => {
            if (!item.id) {
                metrics.influxdb(500, `setAffiliatesEmpty`)
                return
            }
            await setDataCache(`affiliate-${item.id}`, item)
            affiliatesWorker[item.id] = item
        })

    } catch (e) {
        catchHandler(e, 'setAffiliatesError')
        metrics.influxdb(500, `setAffiliatesError`)
    }
}

module.exports = {
    setAffiliates,
    getAffiliatesWorker,
    getAffiliatesWorkerById
}


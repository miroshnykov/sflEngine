const {catchHandler} = require('../../middlewares/catchErr')
const {setDataCache} = require('../redis')
const metrics = require('../../metrics')
const zlib = require('zlib')
const fs = require('fs')
const JSONStream = require("JSONStream")
const config = require('plain-config')()

const setAffiliateWebsites = async () => {

    try {
        let gunzip = zlib.createGunzip();
        let file = config.recipe.affiliateWebsites
        if (!file){
            console.log(' no recipe file affiliates')
            return
        }
        let stream = fs.createReadStream(file)
        let jsonStream = JSONStream.parse('*')
        stream.pipe(gunzip).pipe(jsonStream)
        jsonStream.on('data', async (item) => {
            await setDataCache(`affiliateWebsites-${item.affiliateId}`, item)
        })

    } catch (e) {
        catchHandler(e, 'setAffiliateWebsitesError')
        metrics.influxdb(500, `setAffiliateWebsitesError`)
    }
}

module.exports = {
    setAffiliateWebsites
}


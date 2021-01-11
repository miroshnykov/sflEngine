const {catchHandler} = require('../../middlewares/catchErr')
const { setDataCache, delDataCache, getKeysCache} = require('../redis')
const metrics = require('../../metrics')
const zlib = require('zlib')
const fs = require('fs')
const JSONStream = require("JSONStream")
const config = require('plain-config')()

const setAffiliates = async () => {

    try {

        let affiliates = await getKeysCache('affiliate-*')
        // console.log('affiliates count:',affiliates.length)
        for (const affiliate of affiliates) {
            await delDataCache(affiliate)
        }

        let gunzip = zlib.createGunzip();
        let file = config.recipe.affiliates
        // console.log('affiliates config:', config.recipe)
        if (!file) {
            console.log(' no recipe file affiliates')
            return
        }
        let stream = fs.createReadStream(file)
        // console.log('file:', file)
        let jsonStream = JSONStream.parse('*')
        stream.pipe(gunzip).pipe(jsonStream)
        jsonStream.on('data', async (item) => {
            if (!item.id){
                metrics.influxdb(500, `setAffiliatesEmpty`)
                return
            }
            await setDataCache(`affiliate-${item.id}`, item)
        })

    } catch (e) {
        catchHandler(e, 'setAffiliatesError')
        metrics.influxdb(500, `setAffiliatesError`)
    }
}

module.exports = {
    setAffiliates
}


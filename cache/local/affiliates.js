const {catchHandler} = require('../../middlewares/catchErr')
const {getDataCache, setDataCache, delDataCache} = require('../redis')
const {getTargetingApi} = require('../api/targeting')
const metrics = require('../../metrics')
const zlib = require('zlib')
const fs = require('fs')
const JSONStream = require("JSONStream")
const config = require('plain-config')()

const setAffiliates = async () => {

    try {
        let gunzip = zlib.createGunzip();
        let file = config.recipe.affiliates
        // console.log('affiliates config:', config.recipe)
        if (!file){
            console.log(' no recipe file affiliates')
            return
        }
        let stream = fs.createReadStream(file)
        // console.log('file:', file)
        let jsonStream = JSONStream.parse('*')
        stream.pipe(gunzip).pipe(jsonStream)
        jsonStream.on('data', async (item) => {
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


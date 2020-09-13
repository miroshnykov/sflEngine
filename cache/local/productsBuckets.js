const {catchHandler} = require('../../middlewares/catchErr')
const {getDataCache, setDataCache} = require('../redis')
const {getProductsBucketsApi} = require('../api/productsBuckets')
const metrics = require('../../metrics')

const getProductsBucketsLocal = async () => {

    try {
        return await getDataCache(`productsBucketsLocal`)
    } catch (e) {
        catchHandler(e, 'getProductsBucketsLocal')
        metrics.influxdb(500, `getProductsBucketsLocalError`)
        return []
    }
}

const setProductsBucketsLocal = async () => {

    try {
        let productsBucketsData = await getProductsBucketsApi()
        // console.log('productsBucketsData:',productsBucketsData)
        if (productsBucketsData){
            await setDataCache('productsBucketsLocal', productsBucketsData)
        }

        return productsBucketsData

    } catch (e) {
        catchHandler(e, 'setProductsBucketsLocal')
        metrics.influxdb(500, `setProductsBucketsLocalError`)
    }
}


module.exports = {
    getProductsBucketsLocal,
    setProductsBucketsLocal
}


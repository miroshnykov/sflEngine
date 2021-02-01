const {catchHandler} = require('../../middlewares/catchErr')
const {getDataCache, setDataCache} = require('../redis')
const metrics = require('../../metrics')

const getTargetingLocal = async () => {

    try {
        return await getDataCache(`targetingInfo_`)
    } catch (e) {
        catchHandler(e, 'getTargetingLocal')
        metrics.influxdb(500, `getTargetingLocalError`)
    }
}

module.exports = {
    getTargetingLocal,
}


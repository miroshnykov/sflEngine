const {catchHandler} = require('../../middlewares/catchErr')
const {getDataCache, setDataCache} = require('../redis')
const {getTargetingApi} = require('../api/targeting')
const metrics = require('../../metrics')

const getTargetingLocal = async () => {

    try {
        return await getDataCache(`targetingLocal`)
    } catch (e) {
        catchHandler(e, 'getTargetingLocal')
        metrics.influxdb(500, `getTargetingLocalError`)
        return []
    }
}

const setTargetingLocal = async () => {

    try {
        let targeting = await getTargetingApi()
        if (targeting) {
            await setDataCache('targetingLocal', targeting)
        }
        return targeting

    } catch (e) {
        catchHandler(e, 'setTargetingLocal')
        metrics.influxdb(500, `setTargetingLocalError`)
        return []
    }
}


module.exports = {
    getTargetingLocal,
    setTargetingLocal
}


const {catchHandler} = require('../../middlewares/catchErr')
const {getDataCache, setDataCache} = require('../redis')
const {getTargetingApi} = require('../api/targeting')

const getTargetingLocal = async () => {

    try {
        return await getDataCache(`targetingLocal`)
    } catch (e) {
        catchHandler(e, 'getTargetingLocal')
        return []
    }
}

const setTargetingLocal = async () => {

    try {
        let targeting = await getTargetingApi() || []
        await setDataCache('targetingLocal', targeting)
        return targeting

    } catch (e) {
        catchHandler(e, 'setTargetingLocal')
        return []
    }
}


module.exports = {
    getTargetingLocal,
    setTargetingLocal
}


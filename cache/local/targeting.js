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
        let targeting = await getTargetingApi()
        if (targeting.length > 0) {
            console.log(` count targeting: ${targeting.length}`)
            await setDataCache('targetingLocal', targeting)
            return true
        }

    } catch (e) {
        catchHandler(e, 'setTargetingLocal')
    }
}


module.exports = {
    getTargetingLocal,
    setTargetingLocal
}


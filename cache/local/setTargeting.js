const {setDataCache} = require('../redis')
const {getTargeting} = require('../api/getTargeting')
const {catchHandler} = require('../../middlewares/catchErr')

const setTargetingToLocalRedis = async () => {

    try {
        let targeting = await getTargeting(`targeting`)
        if (targeting.length > 0) {
            await setDataCache('targetingLocal', targeting)
            return true
        }

    } catch (e) {
        catchHandler(e, 'setTargetingToLocalRedis')
    }
}

module.exports = {
    setTargetingToLocalRedis,
}


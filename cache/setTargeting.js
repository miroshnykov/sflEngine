const {setDataCache} = require('./redis')
const {getTargeting} = require('./getTargeting')
const {catchHandler} = require('../middlewares/catchErr')

const setTargetingToLocalRedis = async () => {

    try {
        let targeting = await getTargeting(`targeting`)
        if (targeting.length > 0) {
            await setDataCache('targetingLocal', targeting)
            return true
        } else {
            return
        }

    } catch (e) {
        catchHandler(e, 'setTargetingToLocalRedis')
        return
    }
}

module.exports = {
    setTargetingToLocalRedis,
}


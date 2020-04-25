const {setDataCache} = require('./redis')
const {getTargeting} = require('./getTargeting')
const {catchHandler} = require('../middlewares/catchErr')

const setTargetingToLocalRedis = async () => {

    try {
        await setDataCache('targetingLocal', await getTargeting(`targeting`))
        return true
    } catch (e) {
        catchHandler(e, 'setTargetingToLocalRedis')
        return
    }
}

module.exports = {
    setTargetingToLocalRedis,
}


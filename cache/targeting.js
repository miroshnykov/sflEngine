const {catchHandler} = require('../middlewares/catchErr')
const {getDataCache} = require('./redis')

const targetingConditions = async () => {

    try {
        return await getDataCache(`targetingLocal`)
    } catch (e) {
        catchHandler(e, 'targetingConditions')
        return []
    }
}

module.exports = {
    targetingConditions,
}


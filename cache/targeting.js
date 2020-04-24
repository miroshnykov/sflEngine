
const {getDataCache} = require('./redis')

const targetingConditions = async () => {

    try {
        return await getDataCache(`targetingLocal`)
    } catch (e) {
        console.log(e)
    }
}

module.exports = {
    targetingConditions,
}


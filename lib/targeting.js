
const {getDataCache} = require('./redis')

const targetingConditions = async (req) => {

    try {
        return await getDataCache(`targeting`)
    } catch (e) {
        console.log(e)
    }

}

module.exports = {
    targetingConditions,
}


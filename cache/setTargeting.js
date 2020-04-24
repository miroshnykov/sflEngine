const {setDataCache} = require('./redis')
const {getTargeting} = require('./getTargeting')

const setTargetingToLocalRedis = async () => {

    try {
        await setDataCache('targetingLocal', await getTargeting(`targeting`))
    } catch (e) {
        console.log(e)
    }
}

module.exports = {
    setTargetingToLocalRedis,
}


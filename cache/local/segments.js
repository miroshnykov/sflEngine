const {catchHandler} = require('../../middlewares/catchErr')
const {getDataCache, setDataCache} = require('../redis')
const metrics = require('../../metrics')

const getBlockSegmentsLocal = async () => {

    try {
        return await getDataCache(`blockSegments`)
    } catch (e) {
        catchHandler(e, 'getBlockSegmentsLocalError')
        metrics.influxdb(500, `getBlockSegmentsLocalError`)
    }
}

const getStandardSegmentsLocal = async () => {

    try {
        return await getDataCache(`standardSegments`)
    } catch (e) {
        catchHandler(e, 'getStandardSegmentsLocalError')
        metrics.influxdb(500, `getStandardSegmentsLocalError`)
    }
}


const getLandingPagesLocal = async () => {

    try {
        return await getDataCache(`landingPages`)
    } catch (e) {
        catchHandler(e, 'getLandingPagesLocalError')
        metrics.influxdb(500, `getLandingPagesLocalError`)
    }
}


module.exports = {
    getBlockSegmentsLocal,
    getStandardSegmentsLocal,
    getLandingPagesLocal,
}


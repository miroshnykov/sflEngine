const {catchHandler} = require('../../middlewares/catchErr')
const {getDataCache, setDataCache} = require('../redis')
const {getSegmentsApi, getLandingPagesApi} = require('../api/segments')
const metrics = require('../../metrics')

const getSegmentsLocal = async () => {

    try {
        return await getDataCache(`segments`)
    } catch (e) {
        catchHandler(e, 'getSegmentsLocalError')
        metrics.influxdb(500, `getSegmentsLocalError`)
    }
}

const setSegmentsLocal = async () => {

    try {
        let segments = await getSegmentsApi()
        if (segments) {
            await setDataCache('segments', segments)
        }
        return segments

    } catch (e) {
        catchHandler(e, 'setSegmentsLocalError')
        metrics.influxdb(500, `setSegmentsLocalError`)
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


const setLandingPagesLocal = async () => {

    try {
        let lps = await getLandingPagesApi()
        if (lps) {
            await setDataCache('landingPages', lps)
        }
        return lps

    } catch (e) {
        catchHandler(e, 'setSegmentsLocalError')
        metrics.influxdb(500, `setSegmentsLocalError`)
    }
}

module.exports = {
    getSegmentsLocal,
    getLandingPagesLocal,
    setSegmentsLocal,
    setLandingPagesLocal
}


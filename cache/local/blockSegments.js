const {catchHandler} = require('../../middlewares/catchErr')
const {getDataCache, setDataCache} = require('../redis')
const {getBlockSegmentsApi, getLandingPagesApi} = require('../api/blockSegments')
const metrics = require('../../metrics')

const getBlockSegmentsLocal = async () => {

    try {
        return await getDataCache(`blockSegments`)
    } catch (e) {
        catchHandler(e, 'getBlockSegmentsLocalError')
        metrics.influxdb(500, `getBlockSegmentsLocalError`)
    }
}

const setBlockSegmentsLocal = async () => {

    try {
        let blockSegments = await getBlockSegmentsApi()
        if (blockSegments) {
            await setDataCache('blockSegments', blockSegments)
        }
        return blockSegments

    } catch (e) {
        catchHandler(e, 'setBlockSegmentsLocalError')
        metrics.influxdb(500, `setBlockSegmentsLocalError`)
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
        catchHandler(e, 'setLandingPagesLocalError')
        metrics.influxdb(500, `setLandingPagesLocalError`)
    }
}

module.exports = {
    getBlockSegmentsLocal,
    getLandingPagesLocal,
    setBlockSegmentsLocal,
    setLandingPagesLocal
}


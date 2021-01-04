const {catchHandler} = require('../../middlewares/catchErr')
const {getDataCache, setDataCache} = require('../redis')
const {getSegmentsApi, getLandingPagesApi} = require('../api/segments')
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


const setSegmentsLocal = async () => {

    try {
        let segments = await getSegmentsApi()

        let blockSegments = segments.filter(item => item.segmentType === 'block')

        let standardSegments = segments.filter(item => item.segmentType === 'standard')

        if (blockSegments) {
            await setDataCache('blockSegments', blockSegments)
        }
        if (standardSegments) {
            await setDataCache('standardSegments', standardSegments)
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
        console.log(`setLandingPagesLocal lps:`,JSON.stringify(lps))
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
    getStandardSegmentsLocal,
    getLandingPagesLocal,
    setSegmentsLocal,
    setLandingPagesLocal
}


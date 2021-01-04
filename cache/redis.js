const config = require('plain-config')()
const {catchHandler} = require('../middlewares/catchErr')

const metrics = require('../metrics')

const asyncRedis = require('async-redis')
const redisClient = asyncRedis.createClient(config.redisLocal.port, config.redisLocal.host)

redisClient.on('connect', () => {
    console.log(`\x1b[36m  Redis connected to host localhost port ${config.redisLocal.port} \x1b[0m`)
})

redisClient.on('error', (err) => {
    console.log('\x1b[41m Redis error: ' + err + '\x1b[0m')
})

const setRedis = async (key, value) => (await redisClient.set(key, value))

const getRedis = async (value) => (await redisClient.get(value))

const getKeys = async (value) => (await redisClient.keys(value))
const getDbSize = async () => (await redisClient.dbsize())

const deleteRedis = async (key) => (await redisClient.del(key))

const setDataCache = async (key, data) => {

    try {
        await setRedis(key, JSON.stringify(data))
        // console.log(`*** Redis SET { ${key} } \n`)

    } catch (e) {
        metrics.influxdb(500, `setDataCacheError`)
        catchHandler(e, 'setDataCache')
    }
}

const delDataCache = async (key) => {

    try {
        await deleteRedis(key)
        console.log(`*** Redis DEL { ${key} } \n`)

    } catch (e) {
        catchHandler(e, 'delDataCache')
    }
}

const getDataCache = async (key) => {

    try {

        return JSON.parse(await getRedis(key))

    } catch (e) {
        catchHandler(e, 'getDataCache')
        metrics.influxdb(500, `getDataCacheError`)
        return []
    }
}


const getKeysCache = async (key) => {

    try {

        return await getKeys(key)

    } catch (e) {
        catchHandler(e, 'getKeysCacheError')
        metrics.influxdb(500, `getKeysCacheError`)
        return []
    }
}

const getDbSizeCache = async () => {
    try {
        return await getDbSize()
    } catch (e) {
        catchHandler(e, 'getDbSizeCacheError')
        metrics.influxdb(500, `getDbSizeCacheError`)
        return []
    }
}

module.exports = {
    getDataCache,
    setDataCache,
    delDataCache,
    getKeysCache,
    getDbSizeCache
}
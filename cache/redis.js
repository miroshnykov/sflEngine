const config = require('plain-config')()
const {catchHandler} = require('../middlewares/catchErr')

const metrics = require('../metrics')

const asyncRedis = require('async-redis')
const redisClient = asyncRedis.createClient(config.redisLocal.port, config.redisLocal.host)

const logger = require('bunyan-loader')(config.log).child({scope: 'redis.js'})

redisClient.on('connect', () => {
    logger.info(` *** Redis connected to host localhost port:${config.redisLocal.port} } `)
})

redisClient.on('error', (err) => {
    logger.error('Redis error:', err)
})

const setRedis = async (key, value) => (await redisClient.set(key, value))

const setRedisEx = async (key, value) => (await redisClient.set(key, value, "EX", 3600)) //3600s ->  60m

const getRedis = async (value) => (await redisClient.get(value))

const getKeys = async (value) => (await redisClient.keys(value))
const getDbSize = async () => (await redisClient.dbsize())

const deleteRedis = async (key) => (await redisClient.del(key))

const setDataCache = async (key, data) => {

    try {
        await setRedis(key, JSON.stringify(data))

    } catch (e) {
        metrics.influxdb(500, `setDataCacheError`)
        catchHandler(e, 'setDataCache')
    }
}

const setDataCacheEx = async (key, data) => {

    try {
        await setRedisEx(key, JSON.stringify(data))

    } catch (e) {
        metrics.influxdb(500, `setDataCacheExError`)
        catchHandler(e, 'setDataCacheExError')
    }
}

const delDataCache = async (key) => {

    try {
        await deleteRedis(key)

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
    getDbSizeCache,
    setDataCacheEx
}
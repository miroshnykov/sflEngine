const config = require('plain-config')()
const axios = require('axios')

console.log(` call to coreCache host:${config.cacheEngine.host} to get targeting every 5 min`)
const sflCoreCacheRequest = axios.create({
    baseURL: config.cacheEngine.host,
})

const getTargeting = async () => {
    const {data} = await sflCoreCacheRequest.get(`getTargeting`)
    return data
}

module.exports = {
    getTargeting
}
const config = require('plain-config')()
const logger = require('bunyan-loader')().child({scope: 'geo.js'})
const reader = require('mmdb-reader')
const {getClientIp} = require('request-ip')
const {isString} = require('./utils')
const cleanIp = ip => isString(ip) && ip.replace('::ffff:', '') || ''
let ipData = null

resolveIP = (req) => {
    try {
        const maxmind = new reader(config.maxmind.path)
        let ip = getClientIp(req)
        logger.info(`IP:`, ip)
        if (ip === '10.255.0.2'){
            ip = '66.171.165.122' // for testing
        }
        ipData = maxmind.lookup(cleanIp(ip))
        // ipData = maxmind.lookup(cleanIp('66.171.165.122'))
    } catch (e) {
        logger.error(e)
        logger.error(`Maxmind does't work or does't setup properly `)
    } finally {
        return resolveGeo(ipData)
    }

}

const resolveGeo = (ipData) => {
    let geoData = {}
    geoData.country = ipData && ipData.country && ipData.country.iso_code || 'N/A'
    geoData.region = ipData && ipData.subdivisions && ipData.subdivisions[0].iso_code || 'N/A'
    geoData.city = ipData && ipData.city && (ipData.city.names.en ? ipData.city.names.en : ipData.city.names.fr) || 'N/A'
    geoData.ll = [ipData && ipData.location.latitude || 0, ipData && ipData.location.longitude || 0]
    // logger.info('geoData', geoData)
    return geoData
}

module.exports = {
    resolveIP
}
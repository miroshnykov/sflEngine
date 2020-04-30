let env

if (process.env.CI) {
    env = `CI`
}

let config

config = {
    env: process.env.NODE_ENV || env || `production`,
    port: 8089,
    maxmind: {
        path: '/home/conf/GeoIP/GeoIP2-City.mmdb'
    },
    redirectFlowRotator: {
        url: 'http://flow-rotator-eu-west-1-titan-107.infra.systems/signup'
    },
    dimensionsNames: [
        'country',
        'platformAndroid',
        'platformIos',
        'platformWindows',
        'sourceTypeSweepstakes',
        'sourceTypeVod'
    ],
    intervalUpdate: 60000,//1min
    redisLocal: {
        host: 'localhost',
        port: 6379
    },
    cacheEngine: {
        host: 'https://sfl-cach.surge.systems/',
        path: 'getTargeting',
        port: 8089
    },
    log: {
        name: `core-engine`,
        streams: [{
            level: `INFO`,
            stream: process.stdout
        }]
    },
    host: '',
    mysql: {
        host: '',
        port: 0,
        user: '',
        password: '',
        database: ''
    },
    aws: {
        key: '',
        access_key: '',
        region: ''
    }
}

module.exports = config

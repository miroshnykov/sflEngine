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
        url: 'https://titan.infra.systems'
    },
    dynamodb: {
        region: "us-west-2",
        endpoint: 'dynamodb.us-west-2.amazonaws.com',
        tableName: 'prod-flow-rotator-lid',
        accessKeyId: '',
        secretAccessKey: ''
    },
    affiliateApi: {
        host: 'http://affiliate-api.ad-center.com'
    },
    aggragatorApi: {
        host: 'https://aggregator1.surge.systems/'
    },
    dimensionsNames: [
        'country',
        'platformAndroid',
        'platformIos',
        'platformWindows',
        'sourceTypeSweepstakes',
        'sourceTypeVod'
    ],
    intervalUpdate: 60000,//1min , 300000,//5min
    intervalSendAggragator: 10000,//10sec
    redisLocal: {
        host: 'localhost',
        port: 6379
    },
    cacheEngine: {
        host: 'https://sfl-cache.surge.systems/',
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
    },
    influxdb: {
        host: 'https://influx.surge.systems/influxdb',
        project: 'sfl-engine',
        intervalRequest: 10, // batch post to influxdb when queue length gte 100
        intervalSystem: 30000, // 30000 ms = 30 s
        intervalDisk: 60000 // 300000 ms = 5 min
    }
}

module.exports = config

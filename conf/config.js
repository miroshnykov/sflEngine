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
        // url: 'https://titan.infra.systems'
        url: 'https://flow.concord.systems'
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
    sflOffer: {
        recipeFolderCampaigns: '/tmp/recipe_sfl/campaigns.json.gz',
        recipeFolderOffers: '/tmp/recipe_sfl/offers.json.gz',
        host: 'https://sfl-offers.surge.systems/',
        decryptionKey: '',
        intervalGetRecipeFiles: 300000, // 300000 -> 5min
        intervalSetRedis: 330000, // 330000 -> 5.5min
        timeOutGetRecipeFiles: 10000, // 10000 -> 10sec
        timeOutSetRedis: 20000 // 20000 -> 20 sec
    },
    recipe: {
        affiliates: '/tmp/recipe_sfl/affiliates.json.gz',
        affiliateWebsites: '/tmp/recipe_sfl/affiliateWebsites.json.gz',
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
    intervalSendAggragatorOffer: 15000,//15sec
    intervalSendAggragatorStats: 20000,//20sec
    redisLocal: {
        host: 'localhost',
        port: 6379
    },
    cacheEngine: {
        host: 'https://sfl-stash.surge.systems/',
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
    },
    productsBucketsList:
        [   // temporary hardcoded
            // AL-327 AL-328
            // Apple Products: 700,718,738,782,802,804,806,808,810,1106,1108,1110,1168)
            {productId: 700, sourceType: 'sweepstakes'},
            {productId: 718, sourceType: 'sweepstakes'},
            {productId: 738, sourceType: 'sweepstakes'},
            {productId: 782, sourceType: 'sweepstakes'},
            {productId: 802, sourceType: 'sweepstakes'},
            {productId: 804, sourceType: 'sweepstakes'},
            {productId: 806, sourceType: 'sweepstakes'},
            {productId: 808, sourceType: 'sweepstakes'},
            {productId: 810, sourceType: 'sweepstakes'},
            {productId: 1106, sourceType: 'sweepstakes'},
            {productId: 1108, sourceType: 'sweepstakes'},
            {productId: 1110, sourceType: 'sweepstakes'},
            {productId: 1168, sourceType: 'sweepstakes'},
            // Samsung products:  746,752,812,956,824,826,1092,1094,1216,1218,1220
            {productId: 746, sourceType: 'sweepstakes'},
            {productId: 752, sourceType: 'sweepstakes'},
            {productId: 812, sourceType: 'sweepstakes'},
            {productId: 956, sourceType: 'sweepstakes'},
            {productId: 824, sourceType: 'sweepstakes'},
            {productId: 826, sourceType: 'sweepstakes'},
            {productId: 1092, sourceType: 'sweepstakes'},
            {productId: 1094, sourceType: 'sweepstakes'},
            {productId: 1216, sourceType: 'sweepstakes'},
            {productId: 1218, sourceType: 'sweepstakes'},
            {productId: 1220, sourceType: 'sweepstakes'},
            {productId: 650, sourceType: 'sweepstakes'},
            // VOD: 1,3,4,5,8,9,10,21,139,149,878,912,212,840,620,622,632,670,722,878,1152
            {productId: 1, sourceType: 'vod'},
            {productId: 3, sourceType: 'vod'},
            {productId: 4, sourceType: 'vod'},
            {productId: 5, sourceType: 'vod'},
            {productId: 8, sourceType: 'vod'},
            {productId: 9, sourceType: 'vod'},
            {productId: 10, sourceType: 'vod'},
            {productId: 21, sourceType: 'vod'},
            {productId: 139, sourceType: 'vod'},
            {productId: 149, sourceType: 'vod'},
            {productId: 878, sourceType: 'vod'},
            {productId: 912, sourceType: 'vod'},
            {productId: 212, sourceType: 'vod'},
            {productId: 840, sourceType: 'vod'},
            {productId: 620, sourceType: 'vod'},
            {productId: 622, sourceType: 'vod'},
            {productId: 632, sourceType: 'vod'},
            {productId: 670, sourceType: 'vod'},
            {productId: 722, sourceType: 'vod'},
            {productId: 878, sourceType: 'vod'},
            {productId: 1152, sourceType: 'vod'}

        ]
}

module.exports = config

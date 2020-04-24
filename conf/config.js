let env

if (process.env.CI) {
    env = `CI`
}

let config

config = {
    env: process.env.NODE_ENV || env || `production`,
    port: 8089,
    maxmind: {
        path: '/var/lib/GeoIP/GeoIP2-City.mmdb'
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
    redis: {
        host: '',
        port: 6379
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

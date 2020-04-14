let env

if (process.env.CI) {
    env = `CI`
}

let config

config = {
    env: process.env.NODE_ENV || env || `production`,
    port: 8088,
    redis: {
        host: '',
        port: 6379
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

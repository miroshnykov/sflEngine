// const getTime = (date) => (~~(date.getTime() / 1000))
const express = require('express')
const config = require('plain-config')()
const cluster = require(`cluster`)
const numCores = config.cores || require(`os`).cpus().length
// const {v4} = require('uuid')
// const axios = require('axios')
const cors = require('cors')
const logger = require('bunyan-loader')(config.log).child({scope: 'server.js'})
const {signup} = require(`./lib/traffic`)
const {setTargetingToLocalRedis} = require('./cache/local/setTargeting')
const app = express()


if (cluster.isMaster) {
    logger.info(`Master pid:${process.pid} is running`);
    logger.info(`Using node ${process.version} in mode ${config.env} spawning ${numCores} processes, port ${config.port}`)

    for (let i = 0; i < numCores; i++) {
        cluster.fork()
    }

    cluster.on(`exit`, (worker, code, signal) => {
        logger.info(`worker  ${worker.process.pid} died `)
    })

    setInterval(async () => {
        console.time('targeting')
        let response = await setTargetingToLocalRedis()
        if (response) {
            logger.info(`update local redis successfully`)
        } else {
            logger.info(`redis not updated \x1b[33m { empty or some errors to get data  from core-cache-engine }\x1b[0m `)
        }

        console.timeEnd('targeting')

    }, config.intervalUpdate)

} else {
    app.use(cors())

    app.get('/signup', signup)

    app.use(require('./middlewares/not-found'));

    app.use(require('./middlewares/error'));

    app.listen({port: config.port}, () => {
            console.log(`\n🚀\x1b[35m Server ready at http://localhost:${config.port}, worker pid:${process.pid} \x1b[0m \n`)
        }
    )
}


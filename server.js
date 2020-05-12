// const getTime = (date) => (~~(date.getTime() / 1000))
const express = require('express')
const config = require('plain-config')()
const cluster = require(`cluster`)
const numCores = config.cores || require(`os`).cpus().length
// const {v4} = require('uuid')
// const axios = require('axios')
const {sendToAggr} = require('./api/aggregator')
const cors = require('cors')
const logger = require('bunyan-loader')(config.log).child({scope: 'server.js'})
const {signup} = require(`./lib/traffic`)
const {setTargetingLocal} = require('./cache/local/targeting')
const app = express()
let logBuffer = {}

const addToBuffer = (buffer, t, msg) => {
    if (!buffer[t]) {
        buffer[t] = [];
    }
    buffer[t][buffer[t].length] = msg;
}

if (cluster.isMaster) {
    logger.info(`Master pid:${process.pid} is running`);
    logger.info(`Using node ${process.version} in mode ${config.env} spawning ${numCores} processes, port ${config.port}`)

    for (let i = 0; i < numCores; i++) {
        cluster.fork()
    }

    cluster.on(`exit`, (worker, code, signal) => {
        logger.info(`worker  ${worker.process.pid} died `)
    })

    cluster.on('message', (worker, msg) => {

        let timer = new Date();
        let t = Math.round(timer.getTime() / 1000);
        if (msg.type === "click") {
            addToBuffer(logBuffer, t, msg.stats);
        }

    })

    setInterval(async () => {
        console.time('targeting')
        let response = await setTargetingLocal()
        if (response.length > 0) {
            logger.info(`update local redis successfully`)
        } else {
            logger.info(`redis not updated \x1b[33m { empty or some errors to get data  from core-cache-engine }\x1b[0m `)
        }

        console.timeEnd('targeting')

    }, config.intervalUpdate)

    setInterval(async () => {

        let timer = new Date();
        let t = Math.round(timer.getTime() / 1000);

        if (Object.keys(logBuffer).length >= 1){
            console.log('Buffer count:', Object.keys(logBuffer).length)
        }
        for (const index in logBuffer) {
            if (index < t - 2) {
                if (logBuffer[index].length === 0) return
                sendToAggr(logBuffer[index])
                delete logBuffer[index]
            }
        }


    }, config.intervalSendAggragator)

} else {
    app.use(cors())

    app.use('/signup', signup)

    app.use(require('./middlewares/not-found'));

    app.use(require('./middlewares/error'));

    app.listen({port: config.port}, () => {
            console.log(`\n🚀\x1b[35m Server ready at http://localhost:${config.port}, worker pid:${process.pid} \x1b[0m \n`)
        }
    )
}



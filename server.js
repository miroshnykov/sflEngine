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
const {setProductsBucketsLocal} = require('./cache/local/productsBuckets')
const app = express()
let logBuffer = {}
const metrics = require('./metrics')

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
        metrics.influxdb(500, `workerDied`)
    })

    cluster.on('message', (worker, msg) => {

        let timer = new Date();
        let t = Math.round(timer.getTime() / 1000);
        if (msg.type === "click") {
            addToBuffer(logBuffer, t, msg.stats);
        }

    })

    setInterval(async () => {
        try {

            let response = await setTargetingLocal()
            if (response.length > 0) {
                // logger.info(`update targeting local redis successfully`)
                metrics.influxdb(200, `segmentsDataExists`)
            } else {
                logger.info(`targeting local redis not updated { empty or some errors to get data  from core-cache-engine } `)
                metrics.influxdb(200, `segmentsDataEmpty`)
            }

        } catch (e) {
            console.log(e)
            metrics.influxdb(500, `segmentsDataError`)
        }

    }, config.intervalUpdate)

    setInterval(async () => {
        try {

            let response = await setProductsBucketsLocal()
            if (response){
                logger.info(`setProductsBucketsLocal redis successfully, count:${response.length}`)
                metrics.influxdb(200, `setProductsBucketsLocal`)
            } else {
                logger.info(`setProductsBucketsLocal not updated { empty or some errors to get data  from core-cache-engine } `)
                metrics.influxdb(200, `setProductsBucketsLocalEmpty`)
            }


        } catch (e) {
            console.log(e)
            metrics.influxdb(500, `setProductsBucketsLocalError`)
        }

    }, config.intervalUpdate)

    setInterval(async () => {

        let timer = new Date();
        let t = Math.round(timer.getTime() / 1000);

        if (Object.keys(logBuffer).length >= 5) {
            console.log('Buffer count:', Object.keys(logBuffer).length)
        }
        for (const index in logBuffer) {
            if (index < t - 4) {
                if (logBuffer[index].length === 0) return

                for (const j in logBuffer[index]) {
                    sendToAggr(logBuffer[index][j])

                }
                delete logBuffer[index]
            }
        }


    }, config.intervalSendAggragator)

    setInterval(() => {
        if (config.env === 'development') return
        metrics.sendMetricsSystem()
    }, config.influxdb.intervalSystem)

    // setInterval(() => {
    //     if (config.env === 'development') return
    //     metrics.sendMetricsDisk()
    // }, config.influxdb.intervalDisk)


} else {
    app.use(cors())

    app.set('trust proxy', true)

    app.use('/signup', signup)

    app.use('/health', (req, res, next) => {
        res.send('Ok')
    })

    app.use(require('./middlewares/not-found'));

    app.use(require('./middlewares/error'));

    app.listen({port: config.port}, () => {
            console.log(`\n🚀\x1b[35m Server ready at http://localhost:${config.port}, worker pid:${process.pid} \x1b[0m \n`)
            metrics.influxdb(200, `serverRunning`)
        }
    )
}



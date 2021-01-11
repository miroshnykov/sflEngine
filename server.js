const express = require('express')
const config = require('plain-config')()
const cluster = require(`cluster`)
const numCores = config.cores || require(`os`).cpus().length
const {sendToAggr, sendToAggrOffer, sendToAggrStats} = require('./api/aggregator')
const cors = require('cors')
const logger = require('bunyan-loader')(config.log).child({scope: 'server.js'})
const traffic = require(`./routes/signup`)
const offers = require(`./routes/offers`)
const recipeData = require(`./routes/recipeData`)
const {setTargetingLocal} = require('./cache/local/targeting')
const {setSegmentsLocal, setLandingPagesLocal} = require('./cache/local/segments')
const {
    setCampaigns,
    setOffers,
    sqsProcessing
} = require('./cache/local/offers')

const {getKeysCache, getDbSizeCache} = require('./cache/redis')

const {setAffiliates} = require('./cache/local/affiliates')
const {setAffiliateWebsites} = require('./cache/local/affiliateWebsites')

const {setProductsBucketsLocal} = require('./cache/local/productsBuckets')
const {addClick} = require('./cache/api/traffic')
const app = express()
let logBuffer = {}
let logBufferOffer = {}
let logBufferAggrStats = {}
const metrics = require('./metrics')
const path = require('path');
const os = require('os')

app.use(express.static(path.join(__dirname, 'public')));

const addToBuffer = (buffer, t, msg) => {
    if (!buffer[t]) {
        buffer[t] = [];
    }
    buffer[t][buffer[t].length] = msg;
}

const addToBufferOffer = (buffer, t, msg) => {
    if (!buffer[t]) {
        buffer[t] = [];
    }
    buffer[t][buffer[t].length] = msg;
}

const addToBufferAggrStats = (buffer, t, msg) => {
    if (!buffer[t]) {
        buffer[t] = [];
    }
    buffer[t][buffer[t].length] = msg;
}

let campaignsFile = config.recipe.campaigns
let offersFile = config.recipe.offers
let affiliatesFile = config.recipe.affiliates
let affiliateWebsitesFile = config.recipe.affiliateWebsites

if (cluster.isMaster) {

    // let host = 'https://sfl-offers.surge.systems/'
    // let host = 'http://0.0.0.0:8091'

    const socket = require('socket.io-client')(config.sflOffer.host)
    const ss = require('socket.io-stream')
    const fs = require('fs')


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
        if (msg.type === "clickOffer") {
            addToBufferOffer(logBufferOffer, t, msg.stats);
        }
        if (msg.type === "clickAggrStats") {
            addToBufferAggrStats(logBufferAggrStats, t, msg.stats);
        }

    })

    socket.on('connect', () => {
        logger.info(` *** socket connected, host:${config.sflOffer.host}`)
    });

    socket.on('error', (e) => {
        logger.info(` *** some errors, host:${config.sflOffer.host}`, e)
        metrics.influxdb(500, `sflOfferSocketError`)
    });

    socket.on('connect_error', (e) => {
        logger.info(` *** connect_error, host:${config.sflOffer.host}`, e)
        metrics.influxdb(500, `sflOfferConnectError`)
    });


    socket.on('updRecipe', async (message) => {
        await sqsProcessing(message)
    })

    ss(socket).on('sendingCampaigns', (stream) => {
        // console.time(`campaignsFileSpeed`)
        stream.pipe(fs.createWriteStream(campaignsFile))
        stream.on('end', () => {
            let size = getFileSize(campaignsFile) || 0
            logger.info(`campaigns file received, ${campaignsFile}, size:${size}`)
            metrics.influxdb(200, `fileReceivedCampaigns-size-${size}`)
            // console.timeEnd(`campaignsFileSpeed`)
        });
    });


    ss(socket).on('sendingOffers', (stream) => {
        // console.time(`offersFileSpeed`)
        stream.pipe(fs.createWriteStream(offersFile))
        stream.on('end', () => {
            let size = getFileSize(offersFile) || 0
            logger.info(`offers file received, ${offersFile}, size:${size}`)
            metrics.influxdb(200, `fileReceivedOffers-size-${size}`)
            // console.timeEnd(`offersFileSpeed`)
        });
    });

    ss(socket).on('sendingAffiliates', (stream) => {
        // console.time(`affiliatesFileSpeed`)
        stream.pipe(fs.createWriteStream(affiliatesFile))
        stream.on('end', () => {
            let size = getFileSize(affiliatesFile) || 0
            logger.info(`affiliates file received, ${affiliatesFile}, size:${size}`)
            metrics.influxdb(200, `fileReceivedAffiliates-size-${size}`)
            // console.timeEnd(`affiliatesFileSpeed`)
        });
    });


    ss(socket).on('sendingAffiliateWebsites', (stream) => {
        stream.pipe(fs.createWriteStream(affiliateWebsitesFile))
        stream.on('end', () => {
            let size = getFileSize(affiliateWebsitesFile) || 0
            logger.info(`affiliateWebsites file received, ${affiliateWebsitesFile}, size:${size}`)
            metrics.influxdb(200, `fileReceivedAffiliateWebsites-size-${size}`)
        });
    });

    const getFileSize = (filename) => {
        try {
            let stats = fs.statSync(filename)
            return stats.size
        } catch (e) {
            logger.error('getFileSizeError:', e)
        }
    }

    setInterval(async () => {
        if (config.env === 'development') return
        try {
            socket.emit('sendFileCampaign')
            socket.emit('sendFileOffer')
            socket.emit('sendFileAffiliates')
            socket.emit('sendFileAffiliateWebsites')
        } catch (e) {
            logger.error(`emitSendFilesTimeError:`, e)
            metrics.influxdb(500, `emitSendFilesTimeError`)
        }

    }, config.sflOffer.intervalGetRecipeFiles)

    setInterval(async () => {
        if (config.env === 'development') return
        try {
            logger.info(` **** setOffers to Redis`)
            await setOffers()
            // await setCampaigns()
            // await setAffiliates()
            // await setAffiliateWebsites()
        } catch (e) {
            logger.error(`setOffersError:`, e)
            metrics.influxdb(500, `setOffersError`)
        }

    }, config.sflOffer.intervalSetRedis)

    setInterval(async () => {
        if (config.env === 'development') return
        try {
            logger.info(` **** setCampaigns to Redis`)
            await setCampaigns()
        } catch (e) {
            logger.error(`setCampaignsError:`, e)
            metrics.influxdb(500, `setCampaignsError`)
        }

    }, config.sflOffer.intervalSetRedis + 30000)

    setInterval(async () => {
        if (config.env === 'development') return
        try {
            logger.info(` **** setAffiliates to Redis`)
            await setAffiliates()
        } catch (e) {
            logger.error(`setAffiliatesError:`, e)
            metrics.influxdb(500, `setAffiliatesError`)
        }

    }, config.sflOffer.intervalSetRedis + 40000)


    setInterval(async () => {
        if (config.env === 'development') return
        try {
            logger.info(` **** setAffiliateWebsites to Redis`)
            await setAffiliateWebsites()
        } catch (e) {
            logger.error(`setAffiliateWebsitesError:`, e)
            metrics.influxdb(500, `setAffiliateWebsitesError`)
        }

    }, config.sflOffer.intervalSetRedis + 50000)

    // run one time then instance initialize
    setTimeout(async () => {
        if (config.env === 'development') return
        try {
            logger.info('One time to get recipe file')
            socket.emit('sendFileCampaign')
            socket.emit('sendFileOffer')
            socket.emit('sendFileAffiliates')
            socket.emit('sendFileAffiliateWebsites')
        } catch (e) {
            logger.error(`emitSendFileOneTimeError:`, e)
            metrics.influxdb(500, `emitSendFileOneTimeError`)
        }

    }, config.sflOffer.timeOutGetRecipeFiles)

    setInterval(async () => {
        if (config.env === 'development') return
        try {
            let offers = await getKeysCache('offer-*')
            let campaigns = await getKeysCache('campaign-*')
            let affiliates = await getKeysCache('affiliate-*')
            let affiliateWebsites = await getKeysCache('affiliateWebsites-*')
            let dbSizeCache = await getDbSizeCache()
            const computerName = os.hostname()
            metrics.influxdb(200, `recipeData-${computerName}-offers-${offers.length}-campaigns-${campaigns.length}-affiliates-${affiliates.length}-affiliateWebsites-${affiliateWebsites.length}`)
            metrics.influxdb(200, `computerName-${computerName}-redisRecords-${dbSizeCache}`)

        } catch (e) {
            logger.error(`recipeDataError:`, e)
            metrics.influxdb(500, `recipeDataError`)
        }

    }, 450000) // 7.5 min

    setTimeout(async () => {
        if (config.env === 'development') return
        logger.info('One time set local redis')
        try {
            await setOffers()
            await setCampaigns()
            await setAffiliates()
            await setAffiliateWebsites()
        } catch (e) {
            logger.error(`setOffersCampaignsOneTimeError:`, e)
            metrics.influxdb(500, `setOffersCampaignsOneTimeError`)
        }

    }, config.sflOffer.timeOutSetRedis)

    setInterval(async () => {
        try {
            if (config.env === 'development') return
            let response = await setTargetingLocal()
            if (!response) {
                logger.info(` *CRON* setTargetingLocal getTargetingApi get errors`)
                metrics.influxdb(500, `targetingDataApiError`)
                return
            }
            if (response.length > 0) {
                // logger.info(` *CRON* update targeting local redis successfully`)
                metrics.influxdb(200, `targetingDataExists`)
            } else {
                logger.info(`  *CRON*  targeting local redis not updated { empty or some errors to get data  from sfl_cache } `)
                metrics.influxdb(200, `targetingDataEmpty`)
            }

        } catch (e) {
            logger.error(e)
            metrics.influxdb(500, `targetingDataError`)
        }

    }, config.intervalUpdate)

    setInterval(async () => {
        try {

            let response = await setSegmentsLocal()
            if (response) {
                logger.info(` *CRON* setSegmentsLocal redis successfully, count:${response.length}`)
                metrics.influxdb(200, `setSegmentsLocal`)
            } else {
                logger.info(` *CRON* setSegmentsLocal not updated { empty or some errors to get data  from sfl_cache } `)
                metrics.influxdb(200, `setSegmentsLocalEmpty`)
            }


        } catch (e) {
            logger.error(e)
            metrics.influxdb(500, `setSegmentsLocalError`)
        }

    }, config.intervalUpdate)

    setInterval(async () => {
        try {

            let response = await setLandingPagesLocal()
            if (response) {
                logger.info(` *CRON* setLandingPagesLocal redis successfully, count:${response.length}`)
                metrics.influxdb(200, `setLandingPagesLocal`)
            } else {
                logger.info(` *CRON* setLandingPagesLocal not updated { empty or some errors to get data  from sfl_cache } `)
                metrics.influxdb(200, `setLandingPagesLocalEmpty`)
            }


        } catch (e) {
            logger.error(e)
            metrics.influxdb(500, `setLandingPagesLocalError`)
        }

    }, config.intervalUpdate)

    // setInterval(async () => {
    //     try {
    //
    //         let response = await setProductsBucketsLocal()
    //         if (response) {
    //             logger.info(` *CRON* setProductsBucketsLocal redis successfully, count:${response.length}`)
    //             metrics.influxdb(200, `setProductsBucketsLocal`)
    //         } else {
    //             logger.info(` *CRON* setProductsBucketsLocal not updated { empty or some errors to get data  from core-cache-engine } `)
    //             metrics.influxdb(200, `setProductsBucketsLocalEmpty`)
    //         }
    //
    //
    //     } catch (e) {
    //         console.log(e)
    //         metrics.influxdb(500, `setProductsBucketsLocalError`)
    //     }
    //
    // }, config.intervalUpdate)

    setInterval(async () => {

        let timer = new Date();
        let t = Math.round(timer.getTime() / 1000);

        if (Object.keys(logBuffer).length >= 5) {
            logger.info('Buffer count:', Object.keys(logBuffer).length)
        }
        for (const index in logBuffer) {
            if (index < t - 4) {
                if (logBuffer[index].length === 0) return

                for (const j in logBuffer[index]) {
                    let statsData = logBuffer[index][j]
                    sendToAggr(statsData)
                    // addClick(statsData.sflCampaignId, 1, statsData.sflTargetingCpc, statsData.lid)

                }
                delete logBuffer[index]
            }
        }


    }, config.intervalSendAggragator)


    setInterval(async () => {

        let timer = new Date();
        let t = Math.round(timer.getTime() / 1000);

        if (Object.keys(logBufferAggrStats).length >= 5) {
            logger.info('Buffer count:', Object.keys(logBufferAggrStats).length)
        }
        for (const index in logBufferAggrStats) {
            if (index < t - 4) {
                if (logBufferAggrStats[index].length === 0) return

                for (const j in logBufferAggrStats[index]) {
                    let statsData = logBufferAggrStats[index][j]
                    sendToAggrStats(statsData)

                }
                delete logBufferAggrStats[index]
            }
        }


    }, config.intervalSendAggragatorStats)

    setInterval(async () => {

        let timer = new Date();
        let t = Math.round(timer.getTime() / 1000);

        if (Object.keys(logBufferOffer).length >= 5) {
            logger.info('logBufferOffer count:', Object.keys(logBufferOffer).length)
        }
        for (const index in logBufferOffer) {
            if (index < t - 4) {
                if (logBufferOffer[index].length === 0) return

                for (const j in logBufferOffer[index]) {
                    let statsData = logBufferOffer[index][j]
                    sendToAggrOffer(statsData)

                }
                delete logBufferOffer[index]
            }
        }

    }, config.intervalSendAggragatorOffer)

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

    app.use('/signup', traffic.signup)
    app.use('/ad', offers.ad)
    app.use('/getRecipeData', recipeData.getRecipeData)

    app.use('/health', (req, res, next) => {
        res.send('Ok')
    })

    app.use(require('./middlewares/not-found'));

    app.use(require('./middlewares/error'));

    app.listen({port: config.port}, () => {
            // console.log(JSON.stringify(config))
            // console.log(`\n🚀\x1b[35m Server ready at http://localhost:${config.port}, worker pid:${process.pid} , env:${config.env}\x1b[0m \n`)
            logger.info(`🚀 Server ready at http://localhost:${config.port}, worker pid:${process.pid}, env:${config.env}`)
            metrics.influxdb(200, `serverRunning`)
        }
    )


}



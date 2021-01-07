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

let campaignsFile = config.sflOffer.recipeFolderCampaigns
let offersFile = config.sflOffer.recipeFolderOffers
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
        console.log(`\n socket connected, host:${config.sflOffer.host}\n`)
    });

    socket.on('error', (e) => {
        console.log(`\n some errors, host:${config.sflOffer.host}\n`, e)
        metrics.influxdb(500, `sflOfferSocketError`)
    });

    socket.on('connect_error', (e) => {
        console.log(`\n connect_error, host:${config.sflOffer.host}\n`, e)
        metrics.influxdb(500, `sflOfferConnectError`)
    });


    socket.on('updRecipe', async (message) => {
        await sqsProcessing(message)
    })

    ss(socket).on('sendingCampaigns', (stream) => {
        // console.time(`campaignsFileSpeed`)
        stream.pipe(fs.createWriteStream(campaignsFile))
        stream.on('end', () => {
            console.log(`campaigns file received, ${campaignsFile}, size:${getFileSize(campaignsFile) || 0}`)
            metrics.influxdb(200, `fileReceivedCampaigns`)
            // console.timeEnd(`campaignsFileSpeed`)
        });
    });


    ss(socket).on('sendingOffers', (stream) => {
        // console.time(`offersFileSpeed`)
        stream.pipe(fs.createWriteStream(offersFile))
        stream.on('end', () => {
            console.log(`offers file received, ${offersFile}, size:${getFileSize(offersFile) || 0}`)
            metrics.influxdb(200, `fileReceivedOffers`)
            // console.timeEnd(`offersFileSpeed`)
        });
    });

    ss(socket).on('sendingAffiliates', (stream) => {
        // console.time(`affiliatesFileSpeed`)
        stream.pipe(fs.createWriteStream(affiliatesFile))
        stream.on('end', () => {
            console.log(`affiliates file received, ${affiliatesFile}, size:${getFileSize(affiliatesFile) || 0}`)
            metrics.influxdb(200, `fileReceivedAffiliates`)
            // console.timeEnd(`affiliatesFileSpeed`)
        });
    });


    ss(socket).on('sendingAffiliateWebsites', (stream) => {
        stream.pipe(fs.createWriteStream(affiliateWebsitesFile))
        stream.on('end', () => {
            console.log(`affiliateWebsites file received, ${affiliateWebsitesFile}, size:${getFileSize(affiliateWebsitesFile) || 0}`)
            metrics.influxdb(200, `fileReceivedAffiliateWebsites`)
        });
    });

    const getFileSize = (filename) => {
        try {
            let stats = fs.statSync(filename)
            return stats.size
        } catch (e) {
            console.log('getFileSizeError:', e)
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
            console.log(`emitSendFilesTimeError:`, e)
            metrics.influxdb(500, `emitSendFilesTimeError`)
        }

    }, config.sflOffer.intervalGetRecipeFiles) //  300000->5min 20000->20 sec

    setInterval(async () => {
        if (config.env === 'development') return
        try {
            await setOffers()
            await setCampaigns()
            await setAffiliates()
            await setAffiliateWebsites()
        } catch (e) {
            console.log(`setOffersCampaignsError:`, e)
            metrics.influxdb(500, `setOffersCampaignsError`)
        }

    }, config.sflOffer.intervalSetRedis) // wait 30 second then GZ file create   330000->5.5min 20000->20 sec

    // run one time then instance initialize
    setTimeout(async () => {
        if (config.env === 'development') return
        try {
            console.log('One time to get recipe file')
            socket.emit('sendFileCampaign')
            socket.emit('sendFileOffer')
            socket.emit('sendFileAffiliates')
            socket.emit('sendFileAffiliateWebsites')
        } catch (e) {
            console.log(`emitSendFileOneTimeError:`, e)
            metrics.influxdb(500, `emitSendFileOneTimeError`)
        }

    }, config.sflOffer.timeOutGetRecipeFiles) // 10 sec

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
            console.log(`recipeDataError:`, e)
            metrics.influxdb(500, `recipeDataError`)
        }

    }, 450000) // 7.5 min

    setTimeout(async () => {
        if (config.env === 'development') return
        console.log('One time set local redis')
        try {
            await setOffers()
            await setCampaigns()
            await setAffiliates()
            await setAffiliateWebsites()
        } catch (e) {
            console.log(`setOffersCampaignsOneTimeError:`, e)
            metrics.influxdb(500, `setOffersCampaignsOneTimeError`)
        }

    }, config.sflOffer.timeOutSetRedis) // 20 sec

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
            console.log(e)
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
            console.log(e)
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
            console.log(e)
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
            console.log('Buffer count:', Object.keys(logBuffer).length)
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
            console.log('Buffer count:', Object.keys(logBufferAggrStats).length)
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
            console.log('logBufferOffer count:', Object.keys(logBufferOffer).length)
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
            console.log(`\n🚀\x1b[35m Server ready at http://localhost:${config.port}, worker pid:${process.pid} , env:${config.env}\x1b[0m \n`)
            metrics.influxdb(200, `serverRunning`)
        }
    )


}



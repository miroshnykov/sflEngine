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
const {
    setCampaigns,
    setOffers,
    sqsProcessing
} = require('./cache/local/offers')

const {getKeysCache, getDbSizeCache, getDataCache, setDataCache} = require('./cache/redis')

const {getFileSize} = require('./lib/utils')

const {setAffiliates} = require('./cache/local/affiliates')
const {setAffiliateWebsites} = require('./cache/local/affiliateWebsites')

const app = express()
let logBuffer = {}
let logBufferOffer = {}
let logBufferAggrStats = {}
const metrics = require('./metrics')
const path = require('path');
const os = require('os')
const computerName = os.hostname()

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
let segmentsBlockMaster = []
let segmentsStandardMaster = []
let targetingMaster = []
let landingPagesMaster = []
let advertisersMaster = {}

const getAdvertisersMasterById = (prodId) => {
    return prodId && advertisersMaster[prodId] || advertisersMaster
}

const {
    getAffiliatesWebsitesWorker,
    getAffiliatesWebsitesWorkerById
} = require('./cache/local/affiliateWebsites')

const {
    getAffiliatesWorker,
    getAffiliatesWorkerById
} = require('./cache/local/affiliates')

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
        if (msg.type === 'blockSegments') {
            segmentsBlockMaster = JSON.parse(msg.stats)
        }

        if (msg.type === 'blockSegmentsWorker') {
            worker.send({
                type: 'blockSegmentsWorker',
                getBlockSegmentsEvent: "getBlockSegmentsEvent",
                segmentsBlockData: segmentsBlockMaster
            })
        }
        if (msg.type === 'standardSegments') {
            segmentsStandardMaster = JSON.parse(msg.stats)
        }

        if (msg.type === 'standardSegmentsWorker') {
            worker.send({
                type: 'standardSegmentsWorker',
                getStandardSegmentsEvent: "getStandardSegmentsEvent",
                segmentsStandardData: segmentsStandardMaster
            })
        }

        if (msg.type === 'targeting') {
            targetingMaster = JSON.parse(msg.stats)
        }


        if (msg.type === 'targetingWorker') {
            worker.send({
                type: 'targetingWorker',
                getTargetingEvent: "getTargetingEvent",
                targetingData: targetingMaster
            })
        }

        if (msg.type === 'landingPages') {
            landingPagesMaster = JSON.parse(msg.stats)
        }

        if (msg.type === 'landingPagesWorker') {
            worker.send({
                type: 'landingPagesWorker',
                getLandingPagesEvent: "getLandingPagesEvent",
                landingPagesData: landingPagesMaster
            })
        }

        if (msg.type === `affiliateWebsitesWorker`) {
            worker.send({
                type: 'affiliateWebsitesWorker',
                getAffiliatesWebsitesEvent: "getAffiliatesWebsitesEvent",
                affiliatesWebsites: getAffiliatesWebsitesWorker()
            })

        }

        if (msg.type === `affiliateWebsitesWorkerById` && msg.affiliateId) {
            worker.send({
                type: 'affiliateWebsitesWorkerBiId',
                getAffiliatesWebsitesByIdEvent: "getAffiliatesWebsitesByIdEvent",
                affiliatesWebsites: getAffiliatesWebsitesWorkerById(msg.affiliateId)
            })

        }

        if (msg.type === `affiliatesWorker`) {
            worker.send({
                type: 'affiliatesWorker',
                getAffiliatesEvent: "getAffiliatesEvent",
                affiliates: getAffiliatesWorker()
            })

        }

        if (msg.type === `affiliatesWorkerById` && msg.affiliateId) {
            worker.send({
                type: 'affiliatesWorkerBiId',
                getAffiliatesByIdEvent: "getAffiliatesByIdEvent",
                affiliates: getAffiliatesWorkerById(msg.affiliateId)
            })

        }

        if (msg.type === 'advertisersByProdIdWorker') {
            worker.send({
                type: 'advertisersWorker',
                getAdvertisersByProdIdEvent: "getAdvertisersByProdIdEvent",
                advertisersData: getAdvertisersMasterById(msg.prodId)
            })
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
        stream.pipe(fs.createWriteStream(campaignsFile))
        stream.on('end', () => {
            // let size = getFileSize(campaignsFile) || 0
            // logger.info(`campaigns file received, ${campaignsFile}, size:${size}`)
            // metrics.influxdb(200, `fileReceivedCampaigns-size-${size}`)
            setTimeout(async () => {
                if (config.env === 'development') return
                try {
                    logger.info(` *** set Redis Campaigns`)
                    await setCampaigns()
                    metrics.influxdb(200, `setRedisCampaigns-${computerName}`)
                } catch (e) {
                    logger.error(`setRedisCampaignsError:`, e)
                    metrics.influxdb(500, `setRedisCampaignsError-${computerName}`)
                }

            }, 40000) // 40 sec

        })
    })

    ss(socket).on('sendingOffers', (stream) => {
        stream.pipe(fs.createWriteStream(offersFile))
        stream.on('end', () => {
            // let size = getFileSize(offersFile) || 0
            // logger.info(`offers file received, ${offersFile}, size:${size}`)
            // metrics.influxdb(200, `fileReceivedOffers-size-${size}`)

            setTimeout(async () => {
                if (config.env === 'development') return

                try {
                    logger.info(` *** set Redis Offers`)
                    await setOffers()
                    metrics.influxdb(200, `setRedisOffers-${computerName}`)
                } catch (e) {
                    logger.error(`setRedisOffersError:`, e)
                    metrics.influxdb(500, `setRedisOffersError-${computerName}`)
                }

            }, 50000) // 50 sec

        });
    });

    ss(socket).on('sendingAffiliates', (stream) => {
        stream.pipe(fs.createWriteStream(affiliatesFile))
        stream.on('end', () => {
            // let size = getFileSize(affiliatesFile) || 0
            // logger.info(`affiliates file received, ${affiliatesFile}, size:${size}`)

            setTimeout(async () => {
                if (config.env === 'development') return
                try {
                    logger.info(` *** set Redis Affiliates`)
                    await setAffiliates()
                    metrics.influxdb(200, `setRedisAffiliates-${computerName}`)
                } catch (e) {
                    logger.error(`setRedisAffiliatesError:`, e)
                    metrics.influxdb(500, `setRedisAffiliatesError-${computerName}`)
                }

            }, 60000) // 60 sec

            // metrics.influxdb(200, `fileReceivedAffiliates-size-${size}`)
        })
    })


    ss(socket).on('sendingAffiliateWebsites', (stream) => {
        stream.pipe(fs.createWriteStream(affiliateWebsitesFile))
        stream.on('end', () => {
            // let size = getFileSize(affiliateWebsitesFile) || 0
            // logger.info(`affiliateWebsites file received, ${affiliateWebsitesFile}, size:${size}`)
            // metrics.influxdb(200, `fileReceivedAffiliateWebsites-size-${size}`)
            setTimeout(async () => {
                if (config.env === 'development') return
                try {
                    logger.info(` *** set Redis AffiliateWebsites`)
                    await setAffiliateWebsites()
                    metrics.influxdb(200, `setRedisAffiliateWebsites-${computerName}`)
                } catch (e) {
                    logger.error(`setRedisAffiliateWebsitesError:`, e)
                    metrics.influxdb(500, `setRedisAffiliateWebsitesError-${computerName}`)
                }

            }, 90000) // 90 sec

        });
    });

    socket.on('fileSizeInfo', async (fileSizeInfo) => {

        try {

            let fileSizeInfoOld = await getDataCache('fileSizeInfo_')
            if (!fileSizeInfoOld) {
                socket.emit('sendFileCampaign')
                socket.emit('sendFileOffer')
                socket.emit('sendFileAffiliates')
                socket.emit('sendFileAffiliateWebsites')
                await setDataCache('fileSizeInfo_', fileSizeInfo)
                logger.info(`Set to redis fileSizeInfo,${JSON.stringify(fileSizeInfo)}`)
                metrics.influxdb(200, `fileSizeInfoDifferent-${computerName}`)
                return
            }
            if (fileSizeInfoOld.campaign !== fileSizeInfo.campaign) {
                logger.info(`!!!! FileSizeInfo change Campaigns,  OLD: ${fileSizeInfoOld.campaign}, NEW ${fileSizeInfo.campaign}`)
                metrics.influxdb(200, `fileSizeInfoCampaignsDifferent-${computerName}`)
                socket.emit('sendFileCampaign')
            }

            if (fileSizeInfoOld.offer !== fileSizeInfo.offer) {
                logger.info(`!!!! FileSizeInfo change Offers, OLD: ${fileSizeInfoOld.campaign}, NEW ${fileSizeInfo.campaign}`)
                metrics.influxdb(200, `fileSizeInfoOffersDifferent-${computerName}`)
                socket.emit('sendFileOffer')
            }

            if (fileSizeInfoOld.affiliates !== fileSizeInfo.affiliates) {
                logger.info(`!!!! FileSizeInfo change AFFILIATES, OLD: ${fileSizeInfoOld.affiliates}, NEW ${fileSizeInfo.affiliates}`)
                metrics.influxdb(200, `fileSizeInfoAffiliatesDifferent-${computerName}`)
                socket.emit('sendFileAffiliates')
            }

            if (fileSizeInfoOld.affiliateWebsites !== fileSizeInfo.affiliateWebsites) {
                logger.info(`!!!! FileSizeInfo change AffiliateWebsites,  OLD: ${fileSizeInfoOld.affiliateWebsites}, NEW ${fileSizeInfo.affiliateWebsites}`)
                metrics.influxdb(200, `fileSizeInfoAffiliateWebsitesDifferent-${computerName}`)
                socket.emit('sendFileAffiliateWebsites')
            }

            await setDataCache('fileSizeInfo_', fileSizeInfo)
        } catch (e) {
            logger.error(`fileSizeInfoError:`, e)
            metrics.influxdb(500, `fileSizeInfoError-${computerName}`)
        }


    })

    const cronFileSizeInfo = async () => {
        try {
            let fileSizeInfo = await getDataCache('fileSizeInfo_') || []
            // logger.info(` *** checking fileSizeInfo data`)
            socket.emit('fileSizeInfo', fileSizeInfo)
        } catch (e) {
            logger.error(`cronFileSizeInfoError:`, e)
        }

    }

    setInterval(cronFileSizeInfo, 330000) // 330000 -> 5.5min
    setTimeout(cronFileSizeInfo, 20000) // 20 sec, at application start


    // ******************************************** blockedIp
    socket.on('blockedIp', async (blockedIpInfo) => {
        try {
            logger.info(`Set blockedIp to redis:${JSON.stringify(blockedIpInfo)}`)
            await setDataCache('blockedIp_', blockedIpInfo)

        } catch (e) {
            logger.error(`blockedIpError:`, e)
            metrics.influxdb(500, `blockedIpError-${computerName}`)
        }

    })

    const cronBlockedIp = async () => {
        try {
            let blockedIpInfo = await getDataCache('blockedIp_') || []
            // logger.info(` *** checking blockedIpInfo data`)
            socket.emit('blockedIp', blockedIpInfo)
        } catch (e) {
            logger.error(`cronBlockedIpError:`, e)
        }

    }
    setInterval(cronBlockedIp, 3000000) // 50min
    setTimeout(cronBlockedIp, 30000) // 30 sec, at application start

    // ******************************************** targeting
    socket.on('targetingInfo', async (targetingInfo) => {
        try {
            logger.info(`Set targetingInfo to redis:${JSON.stringify(targetingInfo)}`)
            await setDataCache('targetingInfo_', targetingInfo)
            targetingMaster = targetingInfo
            metrics.influxdb(200, `setRedisTargetingInfo`)
        } catch (e) {
            logger.error(`targetingInfoError:`, e)
            metrics.influxdb(500, `targetingInfoError-${computerName}`)
        }

    })

    const cronTargetingInfo = async () => {
        try {
            let targetingInfo = await getDataCache('targetingInfo_') || []
            // logger.info(` *** checking targetingInfo data`)
            socket.emit('targetingInfo', targetingInfo)
        } catch (e) {
            logger.error(`cronTargetingInfoError:`, e)
        }

    }
    setInterval(cronTargetingInfo, 840000) // 840000 > 14 min
    setTimeout(cronTargetingInfo, 30000)// 30 sec, at application start


    // ******************************************** segmentsInfo
    socket.on('segmentsInfo', async (segmentsInfo) => {
        try {
            logger.info(`*** Set segmentInfo to redis:${JSON.stringify(segmentsInfo)}`)
            await setDataCache('segmentsInfo_', segmentsInfo)
            let blockSegments = segmentsInfo.filter(item => item.segmentType === 'block')

            let standardSegments = segmentsInfo.filter(item => item.segmentType === 'standard')

            if (blockSegments) {
                await setDataCache('blockSegments', blockSegments)
                segmentsBlockMaster = blockSegments

            }
            if (standardSegments) {
                await setDataCache('standardSegments', standardSegments)
                segmentsStandardMaster = standardSegments
            }

            metrics.influxdb(200, `setRedisSegmentsInfo`)

        } catch (e) {
            logger.error(`setSegmentsInfoError:`, e)
            metrics.influxdb(500, `setRedisSegmentsInfoError-${computerName}`)
        }

    })
    const syncSegmentsLocalWithRedis = async () => {
        try {
            let segmentsInfo = await getDataCache('segmentsInfo_') || []
            let blockSegments = segmentsInfo.filter(item => item.segmentType === 'block')
            if (JSON.stringify(blockSegments) !== JSON.stringify(segmentsBlockMaster)) {
                logger.info(` *** syncSegmentsBlockLocalWithRedis done ***`)
                segmentsBlockMaster = blockSegments
            }

            let standardSegments = segmentsInfo.filter(item => item.segmentType === 'standard')
            if (JSON.stringify(standardSegments) !== JSON.stringify(segmentsStandardMaster)) {
                logger.info(` *** syncSegmentsStandardLocalWithRedis done ***`)
                segmentsStandardMaster = standardSegments
            }

            let targetingInfo = await getDataCache('targetingInfo_') || []
            if (JSON.stringify(targetingInfo) !== JSON.stringify(targetingMaster)) {
                logger.info(` *** syncTargetingLocalWithRedis done ***`)
                targetingMaster = targetingInfo
            }

            let lpInfo = await getDataCache('landingPages') || []
            if (JSON.stringify(lpInfo) !== JSON.stringify(landingPagesMaster)) {
                logger.info(` *** syncLandingPagesLocalWithRedis done ***`)
                landingPagesMaster = lpInfo
            }

            if (Object.keys(advertisersMaster).length === 0) {
                let advertisersInfo = await getDataCache('advertisersInfo_') || []
                advertisersInfo.forEach(item => {
                    advertisersMaster[item.advertiserProductId] = item
                })
            }

        } catch (e) {
            logger.error(`syncSegmentsLocalWithRedisError:`, e)
        }

    }
    setTimeout(syncSegmentsLocalWithRedis, 20000) // 20 sec, at application start
    setInterval(syncSegmentsLocalWithRedis, 60000) // 60000 -> 1 min

    const cronSegmentsInfo = async () => {
        try {
            let segmentsInfo = await getDataCache('segmentsInfo_') || []
            // logger.info(` *** checking segmentsInfo data`)
            socket.emit('segmentsInfo', segmentsInfo)
        } catch (e) {
            logger.error(`cronSegmentsInfoError:`, e)
        }

    }

    setInterval(cronSegmentsInfo, 66000) // 66000 -> 1.1 min
    setTimeout(cronSegmentsInfo, 20000) // 20 sec, at application start

    // ******************************************** lpInfo
    socket.on('lpInfo', async (lpInfo) => {
        try {
            logger.info(`*** Set lpInfo to redis:${JSON.stringify(lpInfo)}`)
            await setDataCache('landingPages', lpInfo)
            landingPagesMaster = lpInfo
            metrics.influxdb(200, `setRedisLpInfo`)

        } catch (e) {
            logger.error(`setlpInfoError:`, e)
            metrics.influxdb(500, `setRedisLpInfoError-${computerName}`)
        }

    })

    const cronLpInfo = async () => {
        try {
            let lpInfo = await getDataCache('landingPages') || []
            // logger.info(` *** checking lpInfo data`)
            socket.emit('lpInfo', lpInfo)
        } catch (e) {
            logger.error(`cronLpInfoError:`, e)
        }

    }

    setInterval(cronLpInfo, 66000) // 66000 -> 1.1 min
    setTimeout(cronLpInfo, 20000) // 20 sec, at application start

    // ******************************************** advertisersInfo
    socket.on('advertisersInfo', async (advertisersInfo) => {
        try {
            // logger.info(`*** Set advertisersInfo to redis:${JSON.stringify(advertisersInfo)}`)
            logger.info(`*** Set advertisersInfo to redis:${advertisersInfo.length}`)
            await setDataCache('advertisersInfo_', advertisersInfo)

            advertisersInfo.forEach(item => {
                advertisersMaster[item.advertiserProductId] = item
            })
            metrics.influxdb(200, `setRedisAdvertisersInfo`)

        } catch (e) {
            logger.error(`setlpInfoError:`, e)
            metrics.influxdb(500, `setRedisLpInfoError-${computerName}`)
        }

    })

    const cronAdvertisersInfo = async () => {
        try {
            let advertisersInfo = await getDataCache('advertisersInfo_') || []
            // logger.info(` *** checking lpInfo data`)
            socket.emit('advertisersInfo', advertisersInfo)
        } catch (e) {
            logger.error(`cronAdvertisersInfoError:`, e)
        }

    }

    setInterval(cronAdvertisersInfo, 66000) // 66000 -> 1.1 min
    setTimeout(cronAdvertisersInfo, 20000) // 20 sec, at application start

    const checkAffiliatesEmptyRedis = async () => {
        try {

            let affiliates = await getKeysCache('affiliate-*')

            if (affiliates.length === 0) {
                metrics.influxdb(500, `affiliatesRedisEmpty${computerName}`)
                await setAffiliates()
                logger.info(`affiliatesRedisEmpty`)
            }
        } catch (e) {
            logger.error(`checkAffiliatesEmptyRedisError:`, e)
        }

    }

    setInterval(checkAffiliatesEmptyRedis, 200000) // 200000 -> 3.3 min

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

    // setInterval(async () => {
    //     if (config.env === 'development') return
    //     try {
    //         let offers = await getKeysCache('offer-*')
    //         let campaigns = await getKeysCache('campaign-*')
    //         let affiliates = await getKeysCache('affiliate-*')
    //         let affiliateWebsites = await getKeysCache('affiliateWebsites-*')
    //         let dbSizeCache = await getDbSizeCache()
    //         metrics.influxdb(200, `recipeData-${computerName}-offers-${offers.length}-campaigns-${campaigns.length}-affiliates-${affiliates.length}-affiliateWebsites-${affiliateWebsites.length}`)
    //         metrics.influxdb(200, `computerName-${computerName}-redisRecords-${dbSizeCache}`)
    //
    //     } catch (e) {
    //         logger.error(`recipeDataError:`, e)
    //         metrics.influxdb(500, `recipeDataError`)
    //     }
    //
    // }, 450000) // 7.5 min

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

    const {getClientIp} = require('request-ip')

    app.get('/favicon.ico', (req, res) => {
        res.sendStatus(404)
    })

    app.use(async (req, res, next) => {
        // let blockedIp = await getDataCache('blockedIp_') || []
        let blockedIp = config.blockedIp

        if (blockedIp.length === 0) {
            blockedIp = config.blockedIp
            logger.info('blockedIp Empty in Redis, get IPs from config:', JSON.stringify(blockedIp))
        }

        let ip = getClientIp(req)

        if (blockedIp.includes(ip)) {
            logger.info("\n\nIP Blocked >", ip)
            metrics.influxdb(400, `blockedIp-${ip}`)
            res.status(403).end('forbidden')
        } else {
            next()
        }
    });


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

process
    .on('unhandledRejection', (reason, p) => {
        logger.error(reason, 'Unhandled Rejection at Promise', p)
        metrics.influxdb(500, `unhandledRejection`)
    })
    .on('uncaughtException', err => {
        logger.error(err, 'Uncaught Exception thrown')
        metrics.influxdb(500, `uncaughtException`)
        process.exit(1)
    })


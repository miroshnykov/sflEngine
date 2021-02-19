const getBlockSegmentsEvent = () => {
    return new Promise((resolve) => {
        process.send({
            type: `blockSegmentsWorker`,
            getBlockSegmentsEvent: "getBlockSegmentsEvent",
        });
        process.once('message', (msg) => {
            if (msg.getBlockSegmentsEvent) {
                resolve(msg.segmentsBlockData || null)
            }
        });

    })
}

const getStandardSegmentsEvent = () => {
    return new Promise((resolve) => {
        process.send({
            type: `standardSegmentsWorker`,
            getStandardSegmentsEvent: "getStandardSegmentsEvent",
        });
        process.once('message', (msg) => {
            if (msg.getStandardSegmentsEvent) {
                resolve(msg.segmentsStandardData || null)
            }
        });

    })
}


const getTargetingEvent = () => {
    return new Promise((resolve) => {
        process.send({
            type: `targetingWorker`,
            getTargetingEvent: "getTargetingEvent",
        });
        process.once('message', (msg) => {
            if (msg.getTargetingEvent) {
                resolve(msg.targetingData || null)
            }
        });

    })
}

const getLandingPagesEvent = () => {
    return new Promise((resolve) => {
        process.send({
            type: `landingPagesWorker`,
            getLandingPagesEvent: "getLandingPagesEvent",
        });
        process.once('message', (msg) => {
            if (msg.getLandingPagesEvent) {
                resolve(msg.landingPagesData || null)
            }
        });

    })
}

const getAffiliatesWebsitesEvent = () => {
    return new Promise((resolve) => {
        process.send({
            type: `affiliateWebsitesWorker`,
            getAffiliatesWebsitesEvent: "getAffiliatesWebsitesEvent",
        });
        process.once('message', (msg) => {
            if (msg.getAffiliatesWebsitesEvent) {
                resolve(msg.affiliatesWebsites || null)
            }
        });

    })
}

const getAffiliatesWebsitesByIdEvent = (affiliateId) => {
    return new Promise((resolve) => {
        process.send({
            type: `affiliateWebsitesWorkerById`,
            getAffiliatesWebsitesByIdEvent: "getAffiliatesWebsitesByIdEvent",
            affiliateId: affiliateId,
        });
        process.once('message', (msg) => {
            if (msg.getAffiliatesWebsitesByIdEvent) {
                resolve(msg.affiliatesWebsites || null)
            }
        });

    })
}

const getAffiliatesEvent = () => {
    return new Promise((resolve) => {
        process.send({
            type: `affiliatesWorker`,
            getAffiliatesEvent: "getAffiliatesEvent",
        })
        process.once('message', (msg) => {
            if (msg.getAffiliatesEvent) {
                resolve(msg.affiliates || null)
            }
        })

    })
}

const getAffiliatesByIdEvent = (affiliateId) => {
    return new Promise((resolve) => {
        process.send({
            type: `affiliatesWorkerById`,
            getAffiliatesByIdEvent: "getAffiliatesByIdEvent",
            affiliateId: affiliateId,
        })
        process.once('message', (msg) => {
            if (msg.getAffiliatesByIdEvent) {
                resolve(msg.affiliates || null)
            }
        })

    })
}

module.exports = {
    getBlockSegmentsEvent,
    getStandardSegmentsEvent,
    getTargetingEvent,
    getLandingPagesEvent,
    getAffiliatesEvent,
    getAffiliatesByIdEvent,
    getAffiliatesWebsitesEvent,
    getAffiliatesWebsitesByIdEvent
}

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

module.exports = {
    getBlockSegmentsEvent,
    getStandardSegmentsEvent,
    getTargetingEvent,
    getLandingPagesEvent
}

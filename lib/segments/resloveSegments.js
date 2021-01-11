const {catchHandler} = require('../../middlewares/catchErr')
const {getDataCache} = require('../../cache/redis')
const metrics = require('../../metrics')
const config = require('plain-config')()
const logger = require('bunyan-loader')(config.log).child({scope: 'resolveSegments.js'})

const resolveSegments = async (params, segments) => {

    const {country, prod, affiliateId} = params
    let webSite = await getDataCache(`affiliateWebsites-${affiliateId}`)
    params.website = webSite

    logger.info(`Input country:${country}, Prod:${prod}, Websites:${JSON.stringify(webSite)}`)

    try {
        let findConditions = []
        segments.forEach(segment => {
            // console.log('\nsegment name:',segment.name, 'value:', segment.value, 'unclude:',segment.include)

            let rDimension = resolveDimension(params, segment)
            if (rDimension) {

                findConditions.push(segment)
            }


        })
        return findConditions

    } catch (e) {
        catchHandler(e, 'resolveSegmentsError')
        metrics.influxdb(500, `resolveSegmentsError`)
        return []
    }
}

const resolveDimension = (params, segment) => {
    // console.log(`params:${params.platform}, condition:${JSON.stringify(condition)}`)
    let dimensionValue = params[segment.dimension]
    if (!dimensionValue) {
        logger.info(` *** Dimension:${segment.dimension}, does not exists:`)
        return
    }
    if (segment.dimension === 'website') {
        let rWebsite = resolveWebsites(dimensionValue, segment.value)
        if (rWebsite) {
            logger.info(` *** found  by Websites { ${JSON.stringify(segment)} }`)
            return segment
        }
    }
    logger.info(` *** dimensionValue: ${dimensionValue}, 'segment.dimension: { ${segment.dimension} }, segment.value:${segment.value} `)
    if (dimensionValue.toString() === segment.value.toString()) {
        logger.info(` **** dimension:${segment.dimension}, dimensionValue:${dimensionValue}, segment.value:${segment.value} `)
        if (!!!segment.include) {
            logger.info(` ***** found  by condition{ ${JSON.stringify(segment)} } rule.include ${!!segment.include}`)
            return segment
        }
    } else {
        if (!!segment.include) {
            logger.info(` ***** Exlude ${!!segment.include},  Dimension:${segment.dimension}, dimensionValue:${dimensionValue}, segment.value:${segment.value} `)
            logger.info(` ***** Found condition { ${JSON.stringify(segment)} } NOT rule.include ${!!segment.include}`)
            return segment
        }
    }
}

const resolveWebsites = (webSites, segmentValue) => {
    try {
        // console.log(` webSites ${JSON.stringify(webSites)}`)
        // console.log(`segmentValue:${segmentValue}`)
        let {sites} = JSON.parse(webSites.sites)
        let pattern = /^https?\:\/\/www.|^www.?|^https?\:\/\/|^www.?|\.([^.]*)$/g
        let segmentSite = segmentValue.replace(pattern, '');
        let rSite = sites.filter(item => {
            let url = item.url.replace(pattern, '');
            return url === segmentSite
        })
        logger.info(' ***** Resolve  by site ', rSite)
        return rSite.length !== 0

    } catch (e) {
        logger.error(e)
    }

}

module.exports = {
    resolveSegments
}
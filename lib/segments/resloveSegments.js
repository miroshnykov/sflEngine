const {catchHandler} = require('../../middlewares/catchErr')
const {getDataCache} = require('../../cache/redis')
const metrics = require('../../metrics')
const config = require('plain-config')()
const logger = require('bunyan-loader')(config.log).child({scope: 'resolveSegments.js'})

const resolveSegments = async (params, segments) => {

    const {country, prod, affiliateId} = params
    let webSite = await getDataCache(`affiliateWebsites-${affiliateId}`)
    params.website = webSite

    // logger.info(`Input country:${country}, Prod:${prod}, Websites:${JSON.stringify(webSite)}`)

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

const resolveDimension = async (params, segment) => {
    // console.log(`params:${params.platform}, condition:${JSON.stringify(condition)}`)
    const {affiliateId} = params
    params.website = await getDataCache(`affiliateWebsites-${affiliateId}`)

    let dimensionValue = params[segment.dimension]
    if (!dimensionValue) {
        // logger.info(` *** Dimension:${segment.dimension}, does not exists:`)
        return
    }
    if (segment.dimension === 'website') {

        let rWebsite = resolveWebsites(dimensionValue, segment)
        if (rWebsite) {
            // logger.info(` *** found  by Websites { ${JSON.stringify(segment)} }`)
            return segment
        } else {
            return
        }
    }
    // logger.info(` *** dimensionValue: ${dimensionValue}, 'segment.dimension: { ${segment.dimension} }, segment.value:${segment.value} `)
    if (dimensionValue.toString() === segment.value.toString()) {
        // logger.info(` **** dimension:${segment.dimension}, dimensionValue:${dimensionValue}, segment.value:${segment.value} `)
        if (!!!segment.include) {
            // logger.info(` ***** found  by condition{ ${JSON.stringify(segment)} } rule.include ${!!segment.include}`)
            return segment
        }
    } else {
        if (!!segment.include) {
            // logger.info(` ***** Exlude ${!!segment.include},  Dimension:${segment.dimension}, dimensionValue:${dimensionValue}, segment.value:${segment.value} `)
            // logger.info(` ***** Found condition { ${JSON.stringify(segment)} } NOT rule.include ${!!segment.include}`)
            return segment
        }
    }
}

const checkOR = (segments) => {
    let include = !segments[0].include
    let orResolveInclude = false
    let orResolveExclude = false
    if (include) {
        segments.forEach(i => {
            if (i.resolve === true) {
                orResolveInclude = true
            }
        })
        return orResolveInclude

    } else {

        let segmentsResolve = segments.filter(i => i.resolve === true)
        if (segmentsResolve.length !== 0 && segments.length === segmentsResolve.length) {
            orResolveExclude = true
        }

        return orResolveExclude
    }

}

const checkAnd = (segment) => {
    let include = !segment[0].include
    let orResolveInclude = false
    let orResolveExclude = false
    if (include) {
        if (segment[0].resolve === true) {
            orResolveInclude = true
        }
        return orResolveInclude
    } else {
        if (segment[0].resolve === true) {

            orResolveExclude = true
        }

        return orResolveExclude
    }

}

const resolveWebsites = (webSites, segment) => {
    try {
        // console.log(` webSites ${JSON.stringify(webSites)}`)
        // console.log(`segmentValue:${segmentValue}`)

        let {sites} = JSON.parse(webSites.sites)
        let pattern = /^https?\:\/\/www.|^www.?|^https?\:\/\/|^www.?|\.([^.]*)$/g
        let segmentSite = segment.value.replace(pattern, '');
        let rSite = sites.filter(item => {
            let url = item.url.replace(pattern, '');
            return url === segmentSite
        })

        if (rSite.length !== 0) {
            // logger.info(' ***** Resolve  by site ', rSite)
            if (!!!segment.include) {
                // logger.info(` ***** website found  by condition{ ${JSON.stringify(segment)} } rule.include ${!!segment.include}`)
                return true
            }
        } else {
            if (!!segment.include) {
                // logger.info(` ***** Exlude  website ${!!segment.include},  Dimension:${segment.dimension}, site:${JSON.stringify(sites)}, segment.value:${segment.value} `)
                // logger.info(` ***** Found condition { ${JSON.stringify(segment)} } NOT rule.include ${!!segment.include}`)
                return true
            }
        }

    } catch (e) {
        logger.error(e)
    }

}

module.exports = {
    resolveSegments,
    resolveDimension,
    checkOR,
    checkAnd
}
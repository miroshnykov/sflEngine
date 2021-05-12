const {catchHandler} = require('../../middlewares/catchErr')
const {getDataCache} = require('../../cache/redis')
const metrics = require('../../metrics')
const config = require('plain-config')()
const logger = require('bunyan-loader')(config.log).child({scope: 'resolveSegments.js'})
const {getAffiliatesWebsitesByIdEvent} = require('../../cache/localCache')
const {replaceWebsiteReferer} = require('../utils')

const resolveDimension = async (params, segment) => {

    let dimensionValue
    if (segment.dimension === 'affiliate_website') {

        const {affiliateId} = params
        params.affWebsites = await getAffiliatesWebsitesByIdEvent(affiliateId)
        // params.website = await getDataCache(`affiliateWebsites-${affiliateId}`)

        dimensionValue = params[segment.dimension]

        if (!dimensionValue) {
            // logger.info(` *** Dimension:${segment.dimension}, does not exists:`)
            return
        }

        let rWebsite = resolveWebsites(dimensionValue, segment)
        if (rWebsite) {
            // logger.info(` *** found  by Websites { ${JSON.stringify(segment)} }`)
            return segment
        } else {
            return
        }
    }

    if (segment.dimension === 'website') {

        dimensionValue = params[segment.dimension]

        if (!dimensionValue) {
            // logger.info(` *** Dimension:${segment.dimension}, does not exists:`)
            return
        }
        if (replaceWebsiteReferer(params.refererDomain) === replaceWebsiteReferer(segment.value)) {
            return segment
        } else {
            return
        }
    }

    dimensionValue = params[segment.dimension]
    if (!dimensionValue) {
        // logger.info(` *** Dimension:${segment.dimension}, does not exists:`)
        return
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

        if (!webSites) return
        // let {sites} = JSON.parse(webSites.sites)
        let sites = webSites.sites
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
    resolveDimension,
    checkOR,
    checkAnd
}
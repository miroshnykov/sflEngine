const {catchHandler} = require('../../middlewares/catchErr')
const {getDataCache} = require('../../cache/redis')
const metrics = require('../../metrics')

const resolveSegments = async (params, segments) => {

    const {country, prod, affiliateId} = params
    let webSite = await getDataCache(`affiliateWebsites-${affiliateId}`)
    params.website = webSite

    console.log(`Input country:${country}, Prod:${prod}, Websites:${JSON.stringify(webSite)}`)

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
        console.log(` **** Dimension:${segment.dimension}, does not exists:`,)
        return
    }
    if (segment.dimension === 'website') {
        let rWebsite = resolveWebsites(dimensionValue, segment.value)
        if (rWebsite) {
            console.log(`   \x1b[33m***** found  by Websites { ${JSON.stringify(segment)} } \x1b[0m`)
            return segment
        }
    }
    console.log(`dimensionValue: ${dimensionValue}, 'segment.dimension: { ${segment.dimension} }, segment.value:${segment.value} `)
    if (dimensionValue.toString() === segment.value.toString()) {
        console.log(` \n Dimension:${segment.dimension}, dimensionValue:${dimensionValue}, segment.value:${segment.value} `)
        if (!!!segment.include) {
            console.log(`   \x1b[33m***** found  by condition{ ${JSON.stringify(segment)} } rule.include ${!!segment.include}\x1b[0m`)
            return segment
        }
    } else {
        if (!!segment.include) {
            console.log(` \n Exlude ${!!segment.include},  Dimension:${segment.dimension}, dimensionValue:${dimensionValue}, segment.value:${segment.value} `)
            console.log(`   \x1b[33m***** found condition { ${JSON.stringify(segment)} } NOT rule.include ${!!segment.include}\x1b[0m`)
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
        console.log('Resolve  by site ', rSite)
        return rSite.length !== 0

    } catch (e) {
        console.log(e)
    }

}

module.exports = {
    resolveSegments
}
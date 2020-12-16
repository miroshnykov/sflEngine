const {catchHandler} = require('../middlewares/catchErr')

const metrics = require('../metrics')

const resolveSegments = async (params, segments) => {

    const {country, prod} = params
    console.log(`Input country:${country}, Prod:${prod}`)

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
    if (!dimensionValue){
        console.log(` **** Dimension:${segment.dimension}, does not exists:`,)
        return
    }
    // console.log('dimensionValue:', dimensionValue,' condition.value:',segment.value)
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


module.exports = {
    resolveSegments
}
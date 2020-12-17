const {catchHandler} = require('../middlewares/catchErr')

const metrics = require('../metrics')

const resolveBlockSegments = async (params, blockSegments) => {

    const {country, prod} = params
    console.log(`Input country:${country}, Prod:${prod}`)

    try {
        let findConditions = []
        blockSegments.forEach(segment => {
            // console.log('\nsegment name:',segment.name, 'value:', segment.value, 'unclude:',segment.include)

            let rDimension = resolveDimension(params, segment)
            if (rDimension) {

                findConditions.push(segment)
            }


        })
        return findConditions

    } catch (e) {
        catchHandler(e, 'resolveBlockSegmentsError')
        metrics.influxdb(500, `resolveBlockSegmentsError`)
        return []
    }
}

const resolveDimension = (params, blockSegment) => {
    // console.log(`params:${params.platform}, condition:${JSON.stringify(condition)}`)
    let dimensionValue = params[blockSegment.dimension]
    if (!dimensionValue){
        console.log(` **** Dimension:${blockSegment.dimension}, does not exists:`,)
        return
    }
    // console.log('dimensionValue:', dimensionValue,' condition.value:',segment.value)
    if (dimensionValue.toString() === blockSegment.value.toString()) {
        console.log(` \n Dimension:${blockSegment.dimension}, dimensionValue:${dimensionValue}, segment.value:${blockSegment.value} `)
        if (!!!blockSegment.include) {
            console.log(`   \x1b[33m***** found  by condition{ ${JSON.stringify(blockSegment)} } rule.include ${!!blockSegment.include}\x1b[0m`)
            return blockSegment
        }
    } else {
        if (!!blockSegment.include) {
            console.log(` \n Exlude ${!!blockSegment.include},  Dimension:${blockSegment.dimension}, dimensionValue:${dimensionValue}, segment.value:${blockSegment.value} `)
            console.log(`   \x1b[33m***** found condition { ${JSON.stringify(blockSegment)} } NOT rule.include ${!!blockSegment.include}\x1b[0m`)
            return blockSegment
        }
    }
}


module.exports = {
    resolveBlockSegments
}
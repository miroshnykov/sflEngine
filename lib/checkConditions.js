const {catchHandler} = require('../middlewares/catchErr')

const checkConditions = async (targeting, dimensions) => {

    try {

        console.log(`\n***** Start comparing targeting `)

        let dimensionsKey = Object.keys(dimensions)
        console.log('dimensionsKey:', dimensionsKey)

        let dimensionIdentify = identifyDim(dimensionsKey)

        console.log(`\n ***** Identify dimensions: { ${dimensionIdentify} }`)
        let findConditions = []
        targeting.forEach(item => {

            switch (dimensionIdentify) {
                case `country`:
                    let rCountry = resolveCountry(item, dimensions)
                    if (rCountry) {
                        findConditions.push(item)
                    }
                    break;
                case `countrySourceType`:
                    let rCountrySourceType = resolveCountrySourceType(item, dimensions)
                    if (rCountrySourceType) {
                        findConditions.push(item)
                    }
                    break;
                case `countryPlatform`:
                    let rCountryPlatform = resolveCountryPlatform(item, dimensions)
                    if (rCountryPlatform) {
                        findConditions.push(item)
                    }
                    break;
                case `countrySourceTypePlatform`:
                    let rCountrySourceTypePlatform = resolveCountrySourceTypePlatform(item, dimensions)
                    if (rCountrySourceTypePlatform) {
                        findConditions.push(item)
                    }
                    break;
                default:
                    break;
            }

        })

        console.log('     \x1b[32m***** Resolve dimensions Data:\x1b[0m', JSON.stringify(findConditions))
        return findConditions

    } catch (e) {
        catchHandler(e, 'checkConditions')
        return []
    }
}

const identifyDim = (dimensionsKey) => {
    switch (dimensionsKey.length) {
        case 1:
            return 'country'
        case 2:
            return platformOrSourceType(dimensionsKey)
        case 3:
            return 'countrySourceTypePlatform'
        default:
            return 'country'
    }
}

const platformOrSourceType = (dimensionsKey) => {
    let res = 'countrySourceType'
    dimensionsKey.forEach(key => {
        if (key.includes('platform')) {
            res = 'countryPlatform'
        }
    })
    return res
}

const resolveCountry = (item, dimensions) => {

    if (dimensions.country.toString() === item.geo.toString() &&
        item.platformAndroid === 0 &&
        item.platformIos === 0 &&
        item.platformWindows === 0 &&
        item.sourceTypeSweepstakes === 0 &&
        item.sourceTypeVod === 0
    ) {
        console.log(`   \x1b[33m***** found country { ${dimensions.country} } \x1b[0m`)
        return item
    }

}


const resolveCountrySourceType = (item, dimensions) => {
    if (dimensions.country.toString() === item.geo.toString() &&
        item.platformAndroid === 0 &&
        item.platformIos === 0 &&
        item.platformWindows === 0 &&
        (item.sourceTypeSweepstakes === 1 ||
            item.sourceTypeVod === 1)
    ) {
        console.log(`   \x1b[33m***** found countrySourceType { ${dimensions.country}   }  sourceTypeSweepstakes { ${item.sourceTypeSweepstakes} }  sourceTypeSweepstakes { ${item.sourceTypeVod} }\x1b[0m`)
        return item
    }
}

const resolveCountryPlatform = (item, dimensions) => {
    if (dimensions.country.toString() === item.geo.toString() &&
        (item.platformAndroid === 1 ||
            item.platformIos === 1 ||
            item.platformWindows === 1) &&
        item.sourceTypeSweepstakes === 0 &&
        item.sourceTypeVod === 0
    ) {
        console.log(`   \x1b[33m***** found countryPlatform { ${dimensions.country}   }  platformAndroid { ${item.platformAndroid} }  platformIos { ${item.platformIos} } platformWindows { ${item.platformWindows} } \x1b[0m`)
        return item
    }
}

const resolveCountrySourceTypePlatform = (item, dimensions) => {
    if (dimensions.country.toString() === item.geo.toString() &&
        (item.platformAndroid === 1 ||
            item.platformIos === 1 ||
            item.platformWindows === 1) &&
        (item.sourceTypeSweepstakes === 1 ||
            item.sourceTypeVod === 1)
    ) {
        console.log(`   \x1b[33m***** found countrySourceTypePlatform { ${dimensions.country}   }  platformAndroid { ${item.platformAndroid} }  platformIos { ${item.platformIos} } platformWindows { ${item.platformWindows} } sourceTypeSweepstakes { ${item.sourceTypeSweepstakes} }  sourceTypeSweepstakes { ${item.sourceTypeVod} } \x1b[0m`)
        return item
    }
}

const debugLines = (condition) => {
    console.log(`    ***** by segmentid:{ ${condition.segmentId} }  segmentName:{ ${condition.name} } segmentRuleIndex:{ ${condition.segmentRuleIndex} } include:{ ${condition.include} } maximumRulesIndex:{ ${condition.maximumRulesIndex} } dimension:{ ${condition.dimension} }\n`)
}

module.exports = {
    checkConditions
}
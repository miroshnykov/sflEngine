const {catchHandler} = require('../middlewares/catchErr')

const checkConditions = async (targeting, dimensions) => {

    try {

        // console.log(`\n**** Start comparing targeting `)

        let findConditions = []
        let dimensionIdentify = identifyDim(dimensions)

        console.log(' **** dimensionIdentify:', dimensionIdentify)

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

        // let rDimensions = resolveDimensions(item, dimensions)
        // if (rDimensions) {
        //     findConditions.push(item)
        // }


        console.log('     \x1b[32m***** Resolve dimensions Data:\x1b[0m', JSON.stringify(findConditions))
        return findConditions

    } catch (e) {
        catchHandler(e, 'checkConditions')
        return []
    }
}

const identifyDim = (dimensions) => {
    const {
        platformAndroid,
        platformIos,
        platformWindows,
        sourceTypeSweepstakes,
        sourceTypeVod
    } = dimensions

    let result = ''
    if (platformAndroid === false
        && platformIos === false
        && platformWindows === false
        && sourceTypeSweepstakes === false
        && sourceTypeVod === false) {
        result = 'country'
    } else if (
        (platformAndroid === true
            || platformIos === true
            || platformWindows === true)
        && (sourceTypeSweepstakes === false
        && sourceTypeVod === false)
    ) {
        result = 'countryPlatform'
    } else if (
        (platformAndroid === false
            && platformIos === false
            && platformWindows === false)
        && (sourceTypeSweepstakes === true
        || sourceTypeVod === true)
    ) {
        result = 'countrySourceType'
    } else if (
        (platformAndroid === true
            || platformIos === true
            || platformWindows === true)
        && (sourceTypeSweepstakes === true
        || sourceTypeVod === true)
    ) {
        result = 'countrySourceTypePlatform'
    } else {
        result = 'country'
    }
    return result

}

const resolveCountry = (item, dimensions) => {

    if (dimensions.country.toString() === item.geo.toString() &&
        !!item.platformAndroid === false &&
        !!item.platformIos === false &&
        !!item.platformWindows === false &&
        !!item.sourceTypeSweepstakes === false &&
        !!item.sourceTypeVod === false
    ) {
        console.log(`   \x1b[33m***** found country { ${dimensions.country} } dimensions-${JSON.stringify(dimensions)} \x1b[0m`)
        return item
    }

}

const resolveCountrySourceType = (item, dimensions) => {
    if (dimensions.country.toString() === item.geo.toString() &&
        !!item.platformAndroid === false &&
        !!item.platformIos === false &&
        !!item.platformWindows === false &&
        (!!item.sourceTypeSweepstakes === true ||
            !!item.sourceTypeVod === true)
    ) {
        console.log(`   \x1b[33m***** found countrySourceType { ${dimensions.country}   }  sourceTypeSweepstakes { ${item.sourceTypeSweepstakes} }  sourceTypeSweepstakes { ${item.sourceTypeVod} }\x1b[0m`)
        return item
    }
}

const resolveCountryPlatform = (item, dimensions) => {
    if (dimensions.country.toString() === item.geo.toString() &&
        (!!item.platformAndroid === true ||
            !!item.platformIos === true ||
            !!item.platformWindows === true) &&
        (!!item.sourceTypeSweepstakes === false &&
            !!item.sourceTypeVod === false)
    ) {
        console.log(`   \x1b[33m***** found countryPlatform { ${dimensions.country}   }  platformAndroid { ${item.platformAndroid} }  platformIos { ${item.platformIos} } platformWindows { ${item.platformWindows} } \x1b[0m`)
        return item
    }
}

const resolveCountrySourceTypePlatform = (item, dimensions) => {
    if (dimensions.country.toString() === item.geo.toString() &&
        (!!item.platformAndroid === true ||
            !!item.platformIos === true ||
            !!item.platformWindows === true) &&
        (!!item.sourceTypeSweepstakes === true ||
            !!item.sourceTypeVod === true)
    ) {
        console.log(`   \x1b[33m***** found countrySourceTypePlatform { ${dimensions.country}   }  platformAndroid { ${item.platformAndroid} }  platformIos { ${item.platformIos} } platformWindows { ${item.platformWindows} } sourceTypeSweepstakes { ${item.sourceTypeSweepstakes} }  sourceTypeVod { ${item.sourceTypeVod} } \x1b[0m`)
        return item
    }
}

const resolveDimensions = (item, dimensions) => {

    console.log('item.platformAndroid:', item.platformAndroid)
    console.log('item.platformIos:', item.platformIos)
    console.log('item.platformWindows:', item.platformWindows)
    console.log('item.sourceTypeSweepstakes:', item.sourceTypeSweepstakes)
    console.log('item.sourceTypeVod:', item.sourceTypeVod)
    console.log('dimensions:', dimensions)
    if (dimensions.country.toString() === item.geo.toString() &&
        (!!item.platformAndroid === dimensions.platformAndroid &&
            !!item.platformIos === dimensions.platformIos &&
            !!item.platformWindows === dimensions.platformWindows) &&
        (!!item.sourceTypeSweepstakes === dimensions.sourceTypeSweepstakes &&
            !!item.sourceTypeVod === dimensions.sourceTypeVod)
    ) {
        console.log(`   \x1b[33m***** found by dimensions { ${JSON.stringify(dimensions)} } \x1b[0m \n`)
        return item
    }

}

const debugLines = (condition) => {
    console.log(`    ***** by segmentid:{ ${condition.segmentId} }  segmentName:{ ${condition.name} } segmentRuleIndex:{ ${condition.segmentRuleIndex} } include:{ ${condition.include} } maximumRulesIndex:{ ${condition.maximumRulesIndex} } dimension:{ ${condition.dimension} }\n`)
}

module.exports = {
    checkConditions
}
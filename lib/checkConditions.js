const {catchHandler} = require('../middlewares/catchErr')

const metrics = require('../metrics')

const checkConditions = async (targeting, dimensions) => {

    try {

        let findConditions = []
        let dimensionIdentify = identifyDim(dimensions)

        // console.log(targeting)
        console.log(`dimensionIdentify:  \x1b[32m { ${dimensionIdentify} }\x1b[0m`)
        targeting.forEach(targetingItem => {

            switch (dimensionIdentify) {
                case `country`:
                    let rCountry = resolveCountry(targetingItem, dimensions)
                    if (rCountry) {
                        findConditions.push(targetingItem)
                    }
                    break;
                case `countryPlatform`:
                case `countrySourceType`:
                    let rCountrySourceTypeoRPlatform = resolveCountryPlatformOrSourceType(targetingItem, dimensions)
                    if (rCountrySourceTypeoRPlatform) {
                        findConditions.push(targetingItem)
                    }
                    break;
                case `countrySourceTypePlatform`:
                    let rCountrySourceTypePlatform = resolveDimensions(targetingItem, dimensions)
                    if (rCountrySourceTypePlatform) {
                        findConditions.push(rCountrySourceTypePlatform)
                    }
                    break;
                default:
                    break;
            }

        })

        console.log('     ***** Resolve dimensions Data:', JSON.stringify(findConditions))
        return findConditions

    } catch (e) {
        catchHandler(e, 'checkConditions')
        metrics.influxdb(500, `checkConditionsError`)
        return []
    }
}

const resolveCountry = (item, dimensions) => {

    // console.log(dimensions)
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

const resolveCountryPlatformOrSourceType = (targetingItem, dimensions) => {

    if ((!!targetingItem.platformAndroid === true
        || !!targetingItem.platformIos === true
        || !!targetingItem.platformWindows === true)
        && (
            !!targetingItem.sourceTypeSweepstakes === true
            || !!targetingItem.sourceTypeVod === true
        )) {
        console.log(`   ***** stop resolveDimensions { ${dimensions.country}   }  platformAndroid { ${targetingItem.platformAndroid} }  platformIos { ${targetingItem.platformIos} } platformWindows { ${targetingItem.platformWindows} }   sourceTypeSweepstakes { ${targetingItem.sourceTypeSweepstakes} } sourceTypeVod { ${targetingItem.sourceTypeVod} }`)
        return

    }
    return resolveDimensions(targetingItem,dimensions)
}


const resolveDimensions = (targetingItem, dimensions) => {

    let keys = Object.keys(dimensions)
    let dimensionTrue = []

    keys.forEach(key => {
        if (dimensions[key] === true) {
            dimensionTrue.push(key)
        }
    })


    let targetingItemTrue = []
    for (let i = 0; i < dimensionTrue.length; i++) {
        if (!!targetingItem[dimensionTrue[i]] === true) {
            targetingItemTrue.push(dimensionTrue[i])
        }
    }

    // console.log('targetingItemTrue', targetingItemTrue)
    // console.log('dimensionTrue', dimensionTrue)
    if (dimensions.country.toString() === targetingItem.geo.toString() &&
        targetingItemTrue.length === dimensionTrue.length &&
        targetingItemTrue.length !== 0
    ) {
        console.log(`   \x1b[33m***** found by dimension { ${JSON.stringify(dimensionTrue)} } by country { ${dimensions.country} }  \x1b[0m`)
        return targetingItem
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

module.exports = {
    checkConditions
}
const {catchHandler} = require('../middlewares/catchErr')

const checkConditions = async (targeting, dimensions) => {

    try {

        let findConditions = []
        let dimensionIdentify = identifyDim(dimensions)

        targeting.forEach(targetingItem => {

            switch (dimensionIdentify) {
                case `country`:
                    let rCountry = resolveCountry(targetingItem, dimensions)
                    if (rCountry) {
                        findConditions.push(targetingItem)
                    }
                    break;
                case `countryPlatformOrSourceType`:
                    let rCountrySourceType = resolveDimensions(targetingItem, dimensions)
                    if (rCountrySourceType) {
                        findConditions.push(targetingItem)
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

const resolveCountry = (item, dimensions) => {

    console.log(dimensions)
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

    console.log('targetingItemTrue', targetingItemTrue)
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
    } else {
        result = 'countryPlatformOrSourceType'
    }

    return result

}

module.exports = {
    checkConditions
}
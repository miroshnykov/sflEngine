const {catchHandler} = require('../middlewares/catchErr')

const metrics = require('../metrics')

const checkConditions = async (targeting, dimensions) => {

    try {

        let findConditions = []

        targeting.forEach(targetingItem => {
            let targetingItemDim = identifyDim(targetingItem)
            // console.log('\n targetingItemDim:', targetingItemDim)

            switch (targetingItemDim) {
                case `country`:
                    let rCountry = resolveCountry(targetingItem, dimensions)
                    if (rCountry) {
                        findConditions.push(targetingItem)
                    }
                    break;
                case `countryPlatform`:

                    let dimensionsPl = Object.assign({}, dimensions)
                    delete dimensionsPl.sourceTypeSweepstakes
                    delete dimensionsPl.sourceTypeVod
                    let rCountryPlatform = resolveDimensions(targetingItem, dimensionsPl)
                    if (rCountryPlatform) {
                        findConditions.push(targetingItem)
                    }
                    break;
                case `countrySourceType`:
                    let dimensionsSt = Object.assign({}, dimensions)
                    delete dimensionsSt.platformAndroid
                    delete dimensionsSt.platformIos
                    delete dimensionsSt.platformWindows
                    let rCountrySourceType = resolveDimensions(targetingItem, dimensionsSt)
                    if (rCountrySourceType) {
                        findConditions.push(targetingItem)
                    }
                    break;
                case `countrySourceTypePlatform`:
                    let rCountrySourceTypePlatform = resolveCountryPlatformSourceType(targetingItem, dimensions)
                    if (rCountrySourceTypePlatform) {
                        findConditions.push(rCountrySourceTypePlatform)
                    }
                    break;
                default:
                    break;
            }

        })
        if (findConditions.length !==0){
            console.log('Resolve dimensions Data')
            findConditions.forEach(item => {
                console.log(` Name:${item.name}, targetingId:${item.targetingId}, campaignId:${item.campaignId}`)
            })
            console.log(`User dimensions params:${JSON.stringify(dimensions)}\n`)
        }

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
        console.log(`Found by dimension country-${dimensions.country}, targetingId { ${item.targetingId}-${item.name} }`)
        metrics.influxdb(200, `found-dimension-${dimensions.country}`)
        return item
    }

}

const resolveCountryPlatformSourceType = (targetingItem, dimensions) => {

    let keys = Object.keys(dimensions)
    let dimensionTrue = []

    keys.forEach(key => {
        if (dimensions[key] === true) {
            dimensionTrue.push(key)
        }
    })

    if (
        (dimensions.country.toString() === targetingItem.geo.toString())
        && (!!targetingItem.platformAndroid === dimensions.platformAndroid
        || !!targetingItem.platformIos === dimensions.platformIos
        || !!targetingItem.platformWindows === dimensions.platformWindows)
        && (
            !!targetingItem.sourceTypeSweepstakes === dimensions.sourceTypeSweepstakes
            || !!targetingItem.sourceTypeVod === dimensions.sourceTypeVod
        )) {

        let resolveDimension = dimensionTrue.join('-')
        console.log(`Found by dimension-${resolveDimension} by country-${dimensions.country}, targetingId { ${targetingItem.targetingId}-${targetingItem.name} } `)
        metrics.influxdb(200, `found-dimension-${dimensions.country}-${resolveDimension}`)
        return targetingItem
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

    // console.log('targetingItemTrue', targetingItemTrue)
    // console.log('dimensionTrue', dimensionTrue)
    if (dimensions.country.toString() === targetingItem.geo.toString() &&
        targetingItemTrue.length === dimensionTrue.length &&
        targetingItemTrue.length !== 0
    ) {
        let resolveDimension = dimensionTrue.join('-')
        metrics.influxdb(200, `found-dimension-${dimensions.country}-${resolveDimension}`)
        console.log(`Found by dimension-${resolveDimension} by country-${dimensions.country}  targetingId { ${targetingItem.targetingId}-${targetingItem.name} } `)
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
    if (!!platformAndroid === false
        && !!platformIos === false
        && !!platformWindows === false
        && !!sourceTypeSweepstakes === false
        && !!sourceTypeVod === false) {
        result = 'country'
    } else if (
        (!!platformAndroid === true
            || !!platformIos === true
            || !!platformWindows === true)
        && (!!sourceTypeSweepstakes === false
        && !!sourceTypeVod === false)
    ) {
        result = 'countryPlatform'
    } else if (
        (!!platformAndroid === false
            && !!platformIos === false
            && !!platformWindows === false)
        && (!!sourceTypeSweepstakes === true
        || !!sourceTypeVod === true)
    ) {
        result = 'countrySourceType'
    } else if (
        (!!platformAndroid === true
            || !!platformIos === true
            || !!platformWindows === true)
        && (!!sourceTypeSweepstakes === true
        || !!sourceTypeVod === true)
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
const {catchHandler} = require('../middlewares/catchErr')

const checkConditions = async (targeting, dimensions) => {

    try {

        let findConditions = []
        targeting.forEach(targetingItem => {

            let rDimensions = resolveDimensions(targetingItem, dimensions)
            if (rDimensions) {
                findConditions.push(targetingItem)
            }

        })

        console.log('     \x1b[32m***** Resolve dimensions Data:\x1b[0m', JSON.stringify(findConditions))
        return findConditions

    } catch (e) {
        catchHandler(e, 'checkConditions')
        return []
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
    } else
    if (dimensions.country.toString() === targetingItem.geo.toString() &&
        !!targetingItem.platformAndroid === false &&
        !!targetingItem.platformIos === false &&
        !!targetingItem.platformWindows === false &&
        !!targetingItem.sourceTypeSweepstakes === false &&
        !!targetingItem.sourceTypeVod === false
    ) {
        console.log(`   \x1b[33m***** found by country { ${dimensions.country} } dimensions-${JSON.stringify(dimensions)} \x1b[0m`)
        return targetingItem
    }
}


const debugLines = (condition) => {
    console.log(`    ***** by segmentid:{ ${condition.segmentId} }  segmentName:{ ${condition.name} } segmentRuleIndex:{ ${condition.segmentRuleIndex} } include:{ ${condition.include} } maximumRulesIndex:{ ${condition.maximumRulesIndex} } dimension:{ ${condition.dimension} }\n`)
}

module.exports = {
    checkConditions
}
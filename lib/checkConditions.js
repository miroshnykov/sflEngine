const {catchHandler} = require('../middlewares/catchErr')

const checkConditions = async (targeting, dimensions) => {

    try {

        let findConditions = []
        targeting.forEach(item => {

            let rDimensions = resolveDimensions(item, dimensions)
            if (rDimensions) {
                findConditions.push(item)
            }

        })

        console.log('     \x1b[32m***** Resolve dimensions Data:\x1b[0m', JSON.stringify(findConditions))
        return findConditions

    } catch (e) {
        catchHandler(e, 'checkConditions')
        return []
    }
}

const resolveDimensions = (item, dimensions) => {

    let keys = Object.keys(dimensions)
    let dimensionTrue = []
    keys.forEach(key => {
        if (dimensions[key] === true) {
            dimensionTrue.push(key)
        }
    })

    let itemTrue = []
    for (let i = 0; i < dimensionTrue.length; i++) {
        if (!!item[dimensionTrue[i]] === true) {
            itemTrue.push(dimensionTrue[i])
        }
    }

    console.log('itemTrue', itemTrue)
    console.log('dimensionTrue', dimensionTrue)
    if (dimensions.country.toString() === item.geo.toString() &&
        itemTrue.length === dimensionTrue.length
    ) {
        console.log(`   \x1b[33m***** found countrySourceTypePlatform { ${dimensions.country}   }  platformAndroid { ${item.platformAndroid} }  platformIos { ${item.platformIos} } platformWindows { ${item.platformWindows} } sourceTypeSweepstakes { ${item.sourceTypeSweepstakes} }  sourceTypeVod { ${item.sourceTypeVod} } \x1b[0m`)
        return item
    }
}


const debugLines = (condition) => {
    console.log(`    ***** by segmentid:{ ${condition.segmentId} }  segmentName:{ ${condition.name} } segmentRuleIndex:{ ${condition.segmentRuleIndex} } include:{ ${condition.include} } maximumRulesIndex:{ ${condition.maximumRulesIndex} } dimension:{ ${condition.dimension} }\n`)
}

module.exports = {
    checkConditions
}
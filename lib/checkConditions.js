const {catchHandler} = require('../middlewares/catchErr')

const checkConditions = async (targeting, dimensions) => {

    try {

        console.log(`\n***** Start comparing targeting `)

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

    if (dimensions.country.toString() === item.geo.toString() &&
        (!!item.platformAndroid === dimensions.platformAndroid ||
            !!item.platformIos === dimensions.platformIos ||
            !!item.platformWindows === dimensions.platformWindows) &&
        (!!item.sourceTypeSweepstakes === dimensions.sourceTypeSweepstakes ||
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
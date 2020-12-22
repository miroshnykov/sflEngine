const {catchHandler} = require('../middlewares/catchErr')

const metrics = require('../metrics')

const resolveRules = async (params, targetRules) => {

    // console.log(targetRules)
    // console.log('resolve params:', params)

    if (!targetRules) return
    try {
        let findConditions = []
        targetRules.forEach(rules => {

            let rulesFormat = JSON.parse(rules.rules)
            let redirectOfferId = rulesFormat.redirectTo
            // console.log('\n redirectOfferId:', redirectOfferId)

            rulesFormat.rules.forEach(filterGroups => {

                let include = filterGroups.include
                filterGroups.filterGroups.forEach(cond => {
                    cond.conditions.forEach(condition => {
                        condition.include = include
                        condition.redirectOfferId = redirectOfferId

                        // console.log('\nconditions:', JSON.stringify(condition))
                        let rDimension = resolveDimension(params, condition)
                        if (rDimension) {

                            findConditions.push(condition)
                        }

                    })

                })
                // console.log('\ninclude:', filterGroups.include)

            })
        })

        // console.log('\nfindConditions:', findConditions)
        return findConditions

    } catch (e) {
        catchHandler(e, 'resolveError')
        metrics.influxdb(500, `resolveError`)
        return []
    }
}

const resolveDimension = (params, condition) => {
    // console.log(`params:${params.platform}, condition:${JSON.stringify(condition)}`)
    let dimensionValue = params[condition.dimension]
    console.log('dimensionValue:', dimensionValue, ' condition.value:', condition.value)
    if (dimensionValue.toString().toLowerCase() === condition.value.toString().toLowerCase()) {
        // console.log(`   \x1b[33m***** found by  dimension{ ${condition.dimension} , value ${dimensionValue} }\x1b[0m`)
        if (condition.include) {
            console.log(`   \x1b[33m***** found  by condition{ ${JSON.stringify(condition)} } rule.include ${!!condition.include}\x1b[0m`)
            return condition
        }
    } else {
        if (!condition.include) {
            console.log(`   \x1b[33m***** found condition { ${JSON.stringify(condition)} } NOT rule.include ${!!condition.include}\x1b[0m`)
            return condition
        }
    }
}


module.exports = {
    resolveRules
}
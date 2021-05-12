const {catchHandler} = require('../../middlewares/catchErr')

const metrics = require('../../metrics')

const resolveRules = async (params, targetRules) => {

    if (!targetRules) return
    try {
        let findConditions = []
        targetRules.forEach(rules => {

            let rulesFormat = JSON.parse(rules.rules)
            let redirectOfferId = rulesFormat.redirectTo

            rulesFormat.rules.forEach(filterGroups => {

                let include = filterGroups.include
                filterGroups.filterGroups.forEach(cond => {
                    cond.conditions.forEach(condition => {
                        condition.include = include
                        condition.redirectOfferId = redirectOfferId

                        let rDimension = resolveDimension(params, condition)
                        if (rDimension) {

                            findConditions.push(condition)
                        }

                    })

                })

            })
        })

        return findConditions

    } catch (e) {
        catchHandler(e, 'resolveError')
        metrics.influxdb(500, `resolveError`)
        return []
    }
}

const resolveDimension = (params, condition) => {
    let dimensionValue = params[condition.dimension]
    if (dimensionValue.toString().toLowerCase() === condition.value.toString().toLowerCase()) {
        if (condition.include) {
            return condition
        }
    } else {
        if (!condition.include) {
            return condition
        }
    }
}


module.exports = {
    resolveRules
}
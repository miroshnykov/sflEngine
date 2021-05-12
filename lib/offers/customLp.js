const {catchHandler} = require('../../middlewares/catchErr')

const metrics = require('../../metrics')

const customLP = async (country, rules) => {

    try {
        let findConditions = []
        rules.forEach(rule => {
            let rCountry = resolveCountry(country, rule)
            if (rCountry) {
                findConditions.push(rule)
            }
        })

        return findConditions

    } catch (e) {
        catchHandler(e, 'customLpRestrictionError')
        metrics.influxdb(500, `customLpRestrictionError`)
        return []
    }
}

const resolveCountry = (country, rule) => {
    if (country.toString() === rule.country.toString()) {
        return rule
    }
}

module.exports = {
    customLP
}
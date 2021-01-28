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
    console.log(`country:${country}, rule:${JSON.stringify(rule)}`)
    if (country.toString() === rule.country.toString()) {
            console.log(`   \x1b[33m***** found country in CustomLP { ${country} } \x1b[0m`)
            return rule
    }
}

module.exports = {
    customLP
}
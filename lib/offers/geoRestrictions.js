const {catchHandler} = require('../../middlewares/catchErr')

const metrics = require('../../metrics')

const geoRestrictions = async (country, geoRules) => {

    try {
        let findConditions = []
        geoRules.forEach(rule => {
            let rCountry = resolveCountry(country, rule)
            if (rCountry) {
                findConditions.push(rule)
            }
        })


        return findConditions

    } catch (e) {
        catchHandler(e, 'geoRestrictionError')
        metrics.influxdb(500, `geoRestrictionError`)
        return []
    }
}

const resolveCountry = (country, rule) => {
    if (country.toString() === rule.country.toString()) {
        if (rule.include) {
            return rule
        }
    } else {
        if (!rule.include) {
            return rule
        }
    }
}


module.exports = {
    geoRestrictions
}
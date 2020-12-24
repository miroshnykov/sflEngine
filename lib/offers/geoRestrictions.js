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

        // console.log('\nfindConditions:',findConditions)

        return findConditions

    } catch (e) {
        catchHandler(e, 'geoRestrictionError')
        metrics.influxdb(500, `geoRestrictionError`)
        return []
    }
}

const resolveCountry = (country, rule) => {
    console.log(`country:${country}, rule:${JSON.stringify(rule)}`)
    if (country.toString() === rule.country.toString()) {
        console.log(`   \x1b[33m***** found country { ${country} }\x1b[0m`)
        if (rule.include) {
            console.log(`   \x1b[33m***** found country { ${country} } rule.include ${!!rule.include}\x1b[0m`)
            return rule
        }
    } else {
        if (!rule.include) {
            console.log(`   \x1b[33m***** found country { ${country} } NOT rule.include ${!!rule.include}\x1b[0m`)
            return rule
        }
    }
}


module.exports = {
    geoRestrictions
}
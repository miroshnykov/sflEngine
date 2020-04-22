
const checkConditions = async (targeting, params) => {

    try {

        console.log(`\n***** Start comparing sales and segment dimensions`)
        let countryFind = []
        targeting.forEach(item=>{
            if (params.countryCode.toString() === item.geo.toString()){
                countryFind.push(item)
            }
        })
         return countryFind

    } catch (e) {
        console.log(e)
    }
}


const debugLines = (condition) => {
    console.log(`    ***** by segmentid:{ ${condition.segmentId} }  segmentName:{ ${condition.name} } segmentRuleIndex:{ ${condition.segmentRuleIndex} } include:{ ${condition.include} } maximumRulesIndex:{ ${condition.maximumRulesIndex} } dimension:{ ${condition.dimension} }\n`)
}

module.exports = {
    checkConditions
}
const config = require('plain-config')()
const axios = require('axios')

const refCodeRequest = axios.create({
    baseURL: config.affiliateApi.host,
})

const getRefCodeInfo = async (refCode) => {

    // console.log(`*** Get refcode:${refCode} from API`)
    try {
        let {data} = await refCodeRequest.get( `/api/getRefCodeInfo?ref_code=${refCode}`)
        return data

    } catch(e) {
        console.log('*** Not able to parse refCodeInfo from api, use default ')
    }
}

module.exports = {
    getRefCodeInfo
}
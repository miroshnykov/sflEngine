const url = require('url')
const config = require('plain-config')()

const redirectUrl = (req, res, params) => {

    let lp = params.landingPage && params.landingPage.replace(/\s/g, '') || config.redirectFlowRotator.url + '/signup'

    let urlToRedirect = lp + url.format({
        query: {
            'ad_domain': params.query.ad_domain || '',
            'ad_path': params.query.ad_path || '',
            'prod': params.query.prod || '',
            'ref': params.query.ref || '',
            'sf': params.query.sf || '',
            'adserver': params.query.adserver || '',
            'platform': params.query.platform || '',
            'source_type': params.query.source_type || '',
            'lid': params.lid || '',
            'bro': params.bro || ''
        }
    })
    urlToRedirect = reFormatUrl(urlToRedirect)

    let prefix = 'http'

    if (urlToRedirect.substr(0, prefix.length) !== prefix) {
        urlToRedirect = prefix + '://' + urlToRedirect
    }
    let urlToRedirectReplace = replaceParams(urlToRedirect, params)

    // console.log(`UrlToRedirectReplace: { ${urlToRedirectReplace} }`)
    params.urlToRedirect = urlToRedirectReplace
    return urlToRedirectReplace
}

const reFormatUrl = (urlToRedirect) => {

    let count = 0
    let foundCharactersPos = []
    for (let i = 0; i < urlToRedirect.length; i++) {

        if (urlToRedirect[i] === '?') {
            count++
            if (count >= 2) {
                foundCharactersPos.push(i)
            }
        }
    }

    for (let i = 0; i < foundCharactersPos.length; i++) {
        urlToRedirect = replaceAt(urlToRedirect, foundCharactersPos[i], '&')
    }
    return urlToRedirect
}

const replaceAt = (string, index, replace) => {
    return string.substr(0, index) + replace + string.substr(index + 1);
}

const replaceParams = (url, params) => {
    let defaultParams = [
        'affiliate_id',
        'affiliate_type',
        'media_type',
        'sub_type',
        'lid',
        'product_id',
        'custom_audience',
        'affiliate_hash'
    ]
    let reg = {}
    defaultParams.forEach((item) => {
        if (params[item]) {
            reg = new RegExp('\\[' + item + '\\]', 'gi')
            url = url.replace(reg, params[item]);
        }
    })

    return url
}

module.exports = {
    redirectUrl,
}

const lidSfl = (req, params) => (

    {
        'lid': params.lid || null,
        'adDomain': req.headers.host || null,
        'adPath': req.originalUrl || null,
        'device': params.deviceType || null,
        'domain': req.query.ad_domain || null,
        'countryCode': params.countryCode,
        'campaignId': params.campaignId || null,
        'targetingId': params.targetingId || null,
        'targetingCpc': params.targetingCpc || null,
        'region': params.region,
        'sflServer': req.headers.host,
        'spid': req.query.spid || null,
        'userAgent': req.headers['user-agent'] || null,
        'browser': params.browser || null,
        'browserEngine': params.browserEngine || null,
        'browserVersion': params.browserVersion || null,
        'landingPage': params.landingPage || null,
        'os': params.os || null,
        // 'productId': req.query.prod && (parseInt(params.prod) !== 0) && req.query.prod || 0,
        'ref': req.query.ref || 0,
        'refererDomain': params.refererDomain || null,
        'refererPath': params.refererPath || null,
        'searchEngine': req.params.q || req.query.q || null,
        'searchKeyword': req.params.q || req.query.q || null,
        'country': params.dimensions.country || null,
        'sourceTypeSweepstakes': params.dimensions.sourceTypeSweepstakes || null,
        'sourceTypeVod': params.dimensions.sourceTypeVod || null,
        'platformWindows': params.dimensions.platformWindows || null,
        'platformAndroid': params.dimensions.platformAndroid || null,
        'platformIos': params.dimensions.platformIos || null,
        'event_type': 'click',
        '_messageType': 'aggregatorStatSfl',
        'product_id': req.query.prod && (parseInt(params.prod) !== 0) && req.query.prod || 0
    }
)

const lidOffer = (req, params) => (

    {
        'lid': params.lid || null,
        'adDomain': req.headers.host || null,
        'adPath': req.originalUrl || null,
        'device': params.deviceType || null,
        'domain': req.query.ad_domain || null,
        'campaignId': params.campaignId || null,
        'advertiser': params.advertiser || null,
        'verticals': params.verticals || null,
        'offerId': params.offerId || null,
        'region': params.region,
        'sflServer': req.headers.host,
        'spid': req.query.spid || null,
        'userAgent': req.headers['user-agent'] || null,
        'browser': params.browser || null,
        'browserEngine': params.browserEngine || null,
        'browserVersion': params.browserVersion || null,
        'affiliateId': params.affiliateId || null,
        'payoutPercent': params.payoutPercent || null,
        'isCpmOptionEnabled': params.isCpmOptionEnabled || null,
        'landingPage': params.landingPageUrl || null,
        'landingPageId': params.landingPageId || null,
        'conversionType': params.conversionType || null,
        'os': params.os || null,
        'productId': req.query.prod && (parseInt(params.prod) !== 0) && req.query.prod || 0,
        'ref': req.query.ref || null,
        'refererDomain': params.refererDomain || null,
        'refererPath': req.headers['referer'],
        'searchEngine': req.params.q || req.query.q || null,
        'searchKeyword': req.params.q || req.query.q || null,
        'landingPageIdOrigin': params.landingPageIdOrigin || null,
        'capOverrideOfferId': params.capOverrideOfferId || null,
        'country': params.country || null,
        'event_type': 'click',
        '_messageType': 'aggregatorStatSflOffer'
    }
)

module.exports = {
    lidSfl,
    lidOffer
}
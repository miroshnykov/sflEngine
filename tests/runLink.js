const axios = require('axios')
axios.defaults.timeout = 10000
const runLink = async () => {
    let success = 0
    let errors = 0
    for (let i = 0; i < 20; i++) {
        try {
            const respone = await axios.get('https://o.actio.systems/signup?ad_domain=look.erteln.com&ad_path=%2Foffer&prod=2&ref=5280452&uv=1&sf=eone&adserver=1.1.5&m=books&sfv=11&lp=555&debugging=debugging');
            // const respone = await axios.get('https://swish.actios.systems/signup?ad_domain=look.erteln.com&ad_path=%2Foffer&prod=2&ref=5280452&uv=1&sf=eone&adserver=1.1.5&m=books&sfv=11&lp=555&debugging=debugging');

            console.log(`success:${success}`)
            success++
        } catch (e) {
            console.log(`\nERROR here details: ${String(e) || ''} ${e.config && JSON.stringify(e.config) || ''} ${e.syscall && e.syscall || ''} ${e.address && e.address || ''} ${e.port && e.port || ''} ${e.code && e.code || ''} ${e.errno && e.errno || ''} ${e.response && e.response.status || ''} ${e.response && e.response.statusText || ''}`)

            console.log(` *** Errors:${errors}`)
            errors++
        }
    }
    console.log(`\n result success { ${success} }  errors { ${errors} }`)

}

runLink()
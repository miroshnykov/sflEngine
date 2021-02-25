const axios = require('axios')
axios.defaults.timeout = 10000
const runLink = async () => {
    let success = 0
    let errors = 0
    for (let i = 0; i < 1000; i++) {
        try {

            //  autocannon -c 100 -d 10 https://sfl-engin-staging.surge.systems/signup?prod=1&ref=5204378&debugging=debugging
            //   ab -c 15 -n 100 https://sfl-engin-staging.surge.systems/health

            // local contaner
            // autocannon -c 100 -d 10  http://localhost:8089/health
            // ab -c 15 -n 100 http://localhost:8089/health

            // while true; do curl http://localhost:8088/health; sleep 1; done
            // while true; do curl https://o.actio.systems/health; sleep 1; done
            // while true; do curl https://sfl-engin-staging.surge.systems/health; sleep 1; done
            // while true; do curl https://swish.actios.systems/_appname; sleep 1; done

            //local
            // const respone = await axios.get('http://localhost:8088/signup?prod=650&ref=5204378&source_type=Sweepstakes&platform=Android&debugging=debugging');

            // stage
             const respone = await axios.get('https://sfl-engin-staging.surge.systems/signup?prod=1&ref=5204378&debugging=debugging');

            //prod
            // const respone = await axios.get('https://o.actio.systems/health')
            // const respone = await axios.get('https://o.actio.systems/signup?ad_domain=look.erteln.com&ad_path=%2Foffer&prod=2&ref=5280452&uv=1&sf=eone&adserver=1.1.5&m=books&sfv=11&lp=555&debugging=debugging');

            // prod flow rotator
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
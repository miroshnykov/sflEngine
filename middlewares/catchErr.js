const catchHandler = (e, fnname) => {

    console.log(`\nERROR here ${fnname} details: ${String(e) || ''} ${e.config && JSON.stringify(e.config) || ''} ${e.syscall && e.syscall || ''} ${e.address && e.address || ''} ${e.port && e.port || ''} ${e.code && e.code || ''} ${e.errno && e.errno || ''} ${e.response && e.response.status || ''} ${e.response && e.response.statusText || ''}`)

}
module.exports = {
    catchHandler,
}



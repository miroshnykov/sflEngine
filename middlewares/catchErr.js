const catchHandler = (e, fnname) => {

    console.log(`\nERROR here \x1b[33m { ${fnname} } \x1b[0m details:\n  ${String(e) || ''}\n${e.config && JSON.stringify(e.config) || ''}`)
    console.log(`${e.syscall && e.syscall || ''} ${e.address && e.address || ''} ${e.port && e.port || ''} ${e.code && e.code || ''} ${e.errno && e.errno || ''}`)
    console.log(`${e.response && e.response.status || ''} `)
    console.log(`${e.response && e.response.statusText || ''}`)

}
module.exports = {
    catchHandler,
}



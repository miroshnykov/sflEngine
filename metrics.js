const Influx = require('influxdb-nodejs')
const config = require('plain-config')()
const clientInfluxdb = new Influx(config.influxdb.host)
const project = config.influxdb.project
const os = require('os')
const _ = require('lodash')
const {diskinfo} = require('@dropb/diskinfo')
const cpu = require('cpu')
const pino = require('pino')()
let data_metrics = {
    start: 0,
    route: '',
    method: ''
}
const hostname = os.hostname()
let num_cpu = cpu.num();//return CPU's nums

exports.sendMetricsRequest = function (code) {
    clientInfluxdb.write(project + '_request')
        .tag({
            project: project,
            host: hostname,
            route: data_metrics.route,
            method: data_metrics.method,
            status: _.sortedIndex([99, 199, 299, 399, 499, 599], code) * 100,
            spdy: _.sortedIndex([5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000], Date.now() - data_metrics.start)
        })
        .field({
            latency: Date.now() - data_metrics.start,
            code: code,
            method: data_metrics.method,
            route: data_metrics.route,
        })
        .time(Date.now(), 'ms')
        .queue()
    // batch post to influxdb when queue length gte config.influxdb.intervalRequest
    if (clientInfluxdb.writeQueueLength >= config.influxdb.intervalRequest) {
        clientInfluxdb.syncWrite()
            .catch((error) => {
                pino.error(error)
            })
    }
}

exports.sendMetricsSystem = function () {
    let loads = os.loadavg()
    let memoryUsage = process.memoryUsage()
    let totalmem = os.totalmem()
    let freemem = os.freemem()
    let memory_usage_perc = Number((100 - (freemem / totalmem) * 100).toFixed(2))
    let memory_usage_bytes = totalmem - freemem
    let fields = {
        loadavg_1m: loads[0], // 1-minute load averages.
        loadavg_5m: loads[1], // 5-minute load averages.
        loadavg_15m: loads[2], // 15-minute load averages.
        uptime: os.uptime(), // Uptime
        heap_total: memoryUsage.heapTotal, // heapTotal and heapUsed refer to V8's memory usage.
        heap_used: memoryUsage.heapUsed, // heapTotal and heapUsed refer to V8's memory usage.
        rss: memoryUsage.rss, // Resident Set Size, is the amount of space occupied in the main memory device (that is a subset of the total allocated memory) for the process, which includes the heap, code segment and stack
        external: memoryUsage.external, // External refers to the memory usage of C++ objects bound to JavaScript objects managed by V8
        totalmem: totalmem, // Total OS memory
        freemem: freemem, // Free OS memory
        mem_os_usage: memory_usage_perc, // Memory usage %
        memory_usage_bytes: memory_usage_bytes, // Memory usage bytes
    }
    cpu.usage(function (cpu) {
        let load_cpu = 0
        cpu.forEach(function (item) {
            load_cpu += Number(item)
        })
        fields.cpu_avg_perc = load_cpu / num_cpu
        clientInfluxdb.write(project + '_system')
            .tag({
                project: project,
                host: hostname
            })
            .field(fields)
            .time(Date.now(), 'ms')
            .then(() => {})
            .catch((error) => {
                pino.error(error)
            })
    });


}

exports.sendMetricsDisk = function () {
    let fields = {}
    diskinfo()
        .then(disk => {
            let size_in_bytes = ''
            let used_in_percent = ''
            let used_in_bytes = ''
            disk.forEach(function (item) {
                if (
                    item.target.indexOf("snap") < 0
                    && item.target.indexOf("run") < 0
                    && item.target.indexOf("dev") < 0
                    && item.target.indexOf("sys") < 0
                ) {
                    size_in_bytes = item.fstype + "_size_bytes" // sizes in bytes
                    used_in_percent = item.fstype + "_used_perc" // used in %
                    used_in_bytes = item.fstype + "_used_bytes" // used in bytes
                    fields[size_in_bytes] = item.size
                    fields[used_in_percent] = parseInt(item.pcent, 10)
                    fields[used_in_bytes] = item.used
                }
            })
            clientInfluxdb.write(project + '_disk')
                .tag({
                    project: project,
                    host: hostname
                })
                .field(fields)
                .time(Date.now(), 'ms')
                .then(() => {})
                .catch((error) => {
                    pino.error(error)
                })
        })
        .catch((err) => {
            pino.error(err.message)
        })
}

exports.setStartMetric = function (data) {
    data_metrics.start = Date.now()
    data_metrics.route = data.route
    data_metrics.method = data.method
}

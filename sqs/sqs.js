const config = require('plain-config')()

let AWS = require('aws-sdk')
console.log('config.aws:',config.aws)
let sqs = new AWS.SQS({
    accessKeyId: config.aws.access_key,
    secretAccessKey: config.aws.secret_key,
    region: config.aws.region
})

// let queueUrl = 'https://sqs.us-east-1.amazonaws.com/511376436002/sfl-offers-events-staging.fifo'
let queueUrl = config.aws.queue_url
const sendMessageToQueue = async (body) => {

    let params = {
        MessageBody: JSON.stringify(body),
        QueueUrl: queueUrl,
    };

    // console.log('sendMessageToQueue PARAMS:', JSON.stringify(params))
    return sqs.sendMessage(params).promise()
        .then(data => {
            return data
        })
        .catch(err => {
            console.log('Error while fetching messages from the sqs queue', err)
        })
}


module.exports = {
    sendMessageToQueue
}
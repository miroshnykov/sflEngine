const config = require('plain-config')()

let AWS = require('aws-sdk')
console.log('config.aws:',config.aws)
let sqs = new AWS.SQS({
    accessKeyId: config.aws.access_key,
    secretAccessKey: config.aws.secret_key,
    region: config.aws.region
})

let queueUrl = config.aws.sqs_url
const sendMessageToQueue = async (body) => {

    let params = {
        MessageBody: JSON.stringify(body),
        QueueUrl: queueUrl,
    };

    console.log('SendMessageToQueue PARAMS:', JSON.stringify(params))
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
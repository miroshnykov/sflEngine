// const getTime = (date) => (~~(date.getTime() / 1000))
const express = require('express');
const config = require('plain-config')()
// const {v4} = require('uuid')
// const axios = require('axios')
const cors = require('cors')

const app = express()

app.use(cors())

app.get('/health', async (req, res, next) => {
    res.send('OK')
})

app.get('/signup', async (req, res, next) => {
    res.send('signup')

})

app.listen({port: config.port}, () =>
    console.log(`\n🚀\x1b[35m Server ready at http://localhost:${config.port} \x1b[0m \n`)
)

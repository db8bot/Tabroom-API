// require('dotenv').config({ path: './prd.env' })
const express = require('express')
const superagent = require('superagent')
const cookieParser = require('cookie-parser')
const MongoClient = require('mongodb').MongoClient
const uri = `mongodb+srv://${process.env.MONGOUSER}:${process.env.MONGOPASS}@apiscluster.hhd0v.mongodb.net/apikeys?retryWrites=true&w=majority`
const database = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true })
const { randomBytes, createHash } = require('crypto')
var existingKeys

var app = express()
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(cookieParser())

if (process.env.PORT == null || process.env.PORT === '') { // for dev purposes
    app.use(function (req, res, next) {
        res.header('Access-Control-Allow-Origin', '*')
        res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept')
        next()
    })
}


// auth
async function getExistingApiKeys() {
    const dbClient = await database.connect()
    let keys = await dbClient.db('apikeys').collection('hashedKeys').find().toArray()
    existingKeys = keys[0]
    delete existingKeys._id
    existingKeys = existingKeys.keyList
    database.close()
    app.set('authKeys', existingKeys)
    return existingKeys
}

// async function getExistingApiKeys() { //dev
//     return true
// }

getExistingApiKeys().then(keys => (existingKeys = keys)).finally(() => {
    app.emit('ready')
})


function hash(apiKey) {
    return createHash('sha256').update(apiKey).digest('hex')
}

function generateAPIKey() {
    var apiKey = randomBytes(36).toString('hex')
    var hashedAPIKey = hash(apiKey)
    return { apiKey, hashedAPIKey }
}

// meta functions
app.post('/getAPIKey', async (req, resApp) => {
    const { apiKey, hashedAPIKey } = generateAPIKey(existingKeys)

    // return apikey not the hashedApikey
    resApp.send({ apiKey })

    // post user details & hash to mongo
    const dbClient = await database.connect()
    await dbClient.db('apikeys').collection('hashedKeys').updateOne({}, { $push: { keyList: hashedAPIKey } })

    // update existingKeys
    existingKeys = await getExistingApiKeys()
    database.close()
})

// setup universal useragent

superagent
    .get('https://omahaproxy.appspot.com/win')
    .end((err, res) => {
        if (err) console.error(err)
        app.set('useragent', `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${res.text.substring(0, res.text.indexOf('.'))}.0.0.0 Safari/537.36`)
    })


// routes
app.use('/paradigm', require('./routes/paradigm'))
app.use('/follow', require('./routes/follow'))
app.use('/login', require('./routes/login'))
app.use('/tournamentinfo', require('./routes/tournamentinfo'))


var port = process.env.PORT
if (port == null || port === '') {
    port = 8082
}
app.on('ready', () => {
    app.listen(port, () => {
        console.log(`Listening at http://localhost:${port}`)
    })
})
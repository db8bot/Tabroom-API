require('dotenv').config({ path: './prd.env' })
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

// token exp test
function tabroomTokenTest(req, resApp) {
    return new Promise((resolve, reject) => {
        superagent
            .get('https://www.tabroom.com/user/student/index.mhtml')
            .set('Cookie', req.body.token)
            .redirects(0)
            .end((err, res) => {
                if (err && err.status !== 302) {
                    resApp.status(500).send(`Error ${err}`)
                    resolve(false)
                }
                if (res.text.includes('Your login session has expired.  Please log in again.')) { // token expired
                    resApp.status(403)
                    resApp.send('Tabroom.com token is out of date, please run /login again to get token.')
                    resolve(false)
                } else {
                    resolve(true)
                }
            })
    })
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


var port = process.env.PORT
if (port == null || port === '') {
    port = 8082
}
app.on('ready', () => {
    app.listen(port, () => {
        console.log(`Listening at http://localhost:${port}`)
    })
})
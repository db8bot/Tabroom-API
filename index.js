const express = require('express')
const superagent = require('superagent')
const qs = require('qs')
const cookieParser = require('cookie-parser')
const router = express.Router()
const MongoClient = require('mongodb').MongoClient
const uri = `mongodb+srv://${process.env.MONGOUSER}:${process.env.MONGOPASS}@apiscluster.hhd0v.mongodb.net/apikeys?retryWrites=true&w=majority`
const database = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true })


var app = express()
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(cookieParser())

if (process.env.PORT == null || process.env.PORT === '') { // for dev purposes
    app.use(function (req, res, next) {
        res.header('Access-Control-Allow-Origin', '*')
        // res.header("Access-Control-Allow-Origin", "file:///Users/jim/Documents/NSDA-to-Jitsi-Desktop/index.html");
        res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept')
        next()
    })
}


// auth
async function getExistingApiKeys() {
    const dbClient = await database.connect()
    var existingKeys = await dbClient.db('apikeys').collection('keyList').find().toArray()
    existingKeys = existingKeys[0]
    delete existingKeys._id
    existingKeys = existingKeys.keyArray
    database.close()
    return existingKeys
}

getExistingApiKeys().then(keys => (existingKeys = keys)).finally(() => {
    app.emit('ready')
})

router.use((req, resApp, next) => {
    if (!existingKeys.includes(hash(req.body.apiauth))) {
        return resApp.status(401).send('Invalid API Key or no authentication provided.')
    }
    next()
})

function hash(apiKey) {
    return createHash('sha256').update(apiKey).digest('hex')
}

function generateAPIKey(existingKeys) {
    var apiKey = randomBytes(36).toString('hex')
    if (existingKeys.includes(apiKey)) {
        generateAPIKey(existingKeys)
    } else {
        var hashedAPIKey = hash(apiKey)
        return { apiKey, hashedAPIKey }
    }
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
    if (!req.body.circuit || !req.body.name) {
        // status 401 and send no circuit and name error msg then return
        resApp.status(401)
        resApp.send('No circuit and/or name provided.')
        return
    }
    const { apiKey, hashedAPIKey } = generateAPIKey(existingKeys)

    // return apikey not the hashedApikey
    resApp.send({ apiKey })

    // post user details & hash to mongo
    const dbClient = await database.connect()
    var userDetails = {
        name: req.body.name,
        circuit: req.body.circuit
    }
    await dbClient.db('apikeys').collection('keyList').updateOne({}, { $push: { keyArray: hashedAPIKey } })
    await dbClient.db('apikeys').collection('keyCustomers').insertOne({ [hashedAPIKey]: userDetails })

    // update existingKeys
    existingKeys = await getExistingApiKeys()
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
    port = 8081
}
app.listen(port, () => {
    console.log(`Listening at http://localhost:${port}`)
})
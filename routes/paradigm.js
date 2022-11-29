const cheerio = require('cheerio')
const express = require('express')
const router = express.Router()
const superagent = require('superagent')

const MongoClient = require('mongodb').MongoClient
const uri = `mongodb+srv://${process.env.MONGOUSER}:${process.env.MONGOPASS}@db8botcluster.q3bif.mongodb.net/23bot?retryWrites=true&w=majority`
const database = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true })

router.post('/', async (req, resApp) => {

    let requestLink = ''
    var useragent = req.app.get('useragent')

    if (req.body.type === 'name') {
        requestLink = 'https://www.tabroom.com/index/paradigm.mhtml'
    } else if (req.body.type === 'id') {
        requestLink = `https://www.tabroom.com/index/paradigm.mhtml?judge_person_id=${req.body.id}`
    } else if (req.body.type === 'link') {
        requestLink = req.body.link
    }

    if (requestLink) {
        superagent
            .get(requestLink)
            .set('User-Agent', useragent) // if by name, send post ruqest- need a nother header and condintoality
            .end((err, res) => {
                if (err) return resApp.status(500).send(err)
                const $ = cheerio.load(res.text)

                let paradigmText = $('.paradigm.ltborderbottom').text().trim()

                console.log(paradigmText)
            })
    }

})

module.exports = router
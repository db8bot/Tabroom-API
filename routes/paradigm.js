const cheerio = require('cheerio')
const express = require('express')
const router = express.Router()
const superagent = require('superagent')
const { Tabletojson: tabletojson } = require('tabletojson')

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

    if (req.body.type === 'name') {
        superagent
            .post(requestLink)
            .set('User-Agent', useragent)
            .send({ search_first: req.body.first, search_last: req.body.last })
            .end(async (err, res) => {
                if (err) return resApp.status(500).send(err)
                await paradigmProcessing(res.text)
            })
    } else if (requestLink) {
        superagent
            .get(requestLink)
            .set('User-Agent', useragent)
            .end(async (err, res) => {
                if (err) return resApp.status(500).send(err)
                // check if there are multiple people or no paradigms
                if (res.text.includes('returned no judges. Please try again.')) {
                    console.log('no paradigms found')
                    resApp.status(404).send('no paradigms found')
                } else if (res.text.includes('Paradigm search results')) {
                    console.log('multiple people')
                    const $ = cheerio.load(res.text)

                    for (i = 0; i < $($($('#paradigm_search')[0]).children('tbody')[0]).children('tr').length; i++) {
                        superagent
                        .get(`https://www.tabroom.com${}`)
                        await paradigmProcessing(res.text)
                    }
                } else {

                }

            })
    }

})

async function paradigmProcessing(html) {
    const $ = cheerio.load(html)
    let paradigmText = $('.paradigm.ltborderbottom').text().trim()

    const converted = tabletojson.convert(paradigmText)
    // console.log(paradigmText)
    console.log(converted)
}

module.exports = router
const axios = require('axios').default
const cheerio = require('cheerio')
const express = require('express')
const router = express.Router()

const MongoClient = require('mongodb').MongoClient
const uri = `mongodb+srv://${process.env.MONGOUSER}:${process.env.MONGOPASS}@db8botcluster.q3bif.mongodb.net/23bot?retryWrites=true&w=majority`
const database = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true })

router.post('/', async (req, resApp) => {

    let requestLink = ''

    if (req.body.type === 'name') {
        requestLink = 'https://www.tabroom.com/index/paradigm.mhtml'
    } else if (req.body.type === 'id') {
        requestLink = `https://www.tabroom.com/index/paradigm.mhtml?judge_person_id=${req.body.id}`
    } else if (req.body.type === 'link') {
        requestLink = req.body.link
    }

    if (req.body.link) {
        axios({
            method: 'get',
            url: requestLink
        }).then(async res => {
            const $ = cheerio.load(res.data)
            if (res.data.toLowerCase().includes('Paradigm search results')) { // multiple people exist with this name
                for (i = 0; i < Math.max(3, $('#paradigm_search').children('tbody').children('tr').length); i++) { // scrape all possible or only the top 3

                }
            } else {

            }
        })
    }

})
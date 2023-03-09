const cheerio = require('cheerio')
const express = require('express')
const router = express.Router()
const superagent = require('superagent')
const { Tabletojson: tabletojson } = require('tabletojson')
const crypto = require('crypto')


router.post('/', async (req, resApp) => {

    /* Input schema
    type: string,
    id: string,, optional
    link: string, optional
    first: string, optional
    last: string, optional
    all: true/false, optional
    paradigmOnly: true/false, optional

    */

    // check auth
    var authKeys = req.app.get('authKeys')
    if (!require('../helpers/auth').verifyAuth(authKeys, req, resApp)) return

    let requestLink = ''
    var useragent = req.app.get('useragent')

    if (req.body.type === 'name') {
        requestLink = 'https://www.tabroom.com/index/paradigm.mhtml'
    } else if (req.body.type === 'id') {
        requestLink = `https://www.tabroom.com/index/paradigm.mhtml?judge_person_id=${req.body.id}`
    } else if (req.body.type === 'link') {
        requestLink = req.body.link
    }
    var paradigm = []
    if (req.body.type === 'name') {
        superagent
            .post(requestLink)
            .set('User-Agent', useragent)
            .set('Content-Type', 'application/x-www-form-urlencoded')
            .send({ search_first: req.body.first, search_last: req.body.last })
            .end(async (err, res) => {
                if (err) return resApp.status(500).send(err)
                if (res.text.includes('returned no judges. Please try again.')) { // no paradigms
                    console.log('no paradigms found')
                    resApp.status(404).send('no paradigms found')
                } else if (res.text.includes('Paradigm search results')) { // multiple paradigms
                    console.log('multiple people')
                    let promiseRequestArr = []
                    const $ = cheerio.load(res.text)
                    if (req.body.all === 'false') {
                        superagent
                            .get(`https://www.tabroom.com/index/${$($($('#paradigm_search').children('tbody').children('tr')[0]).children('td')[3]).children('a').attr('href')}`)
                            .set('User-Agent', useragent)
                            .end(async (err, res) => {
                                if (err) return resApp.status(500).send(err)
                                paradigm.push(await paradigmProcessing(res.text, req.body.paradigmOnly))
                                if (paradigm[0].paradigm === "") {
                                    resApp.status(404).send('no paradigms found')
                                } else {
                                    resApp.send(paradigm)
                                }
                            })

                    } else {
                        for (i = 0; i < $('#paradigm_search').children('tbody').children('tr').length; i++) {
                            promiseRequestArr.push(multiRequest(`https://www.tabroom.com/index/${$($($('#paradigm_search').children('tbody').children('tr')[i]).children('td')[3]).children('a').attr('href')}`, req, useragent))
                        }
                        Promise.all(promiseRequestArr).then((values) => {
                            resApp.send(values)
                        })
                    }
                } else { // single paradigm page
                    console.log('single paradigm')
                    paradigm.push(await paradigmProcessing(res.text, req.body.paradigmOnly))
                    resApp.send(paradigm)
                }

            })
    } else if (requestLink) {
        superagent
            .get(requestLink)
            .set('User-Agent', useragent)
            .end(async (err, res) => {
                if (err) return resApp.status(500).send(err)
                // check if there are multiple people or no paradigms
                if (res.text.includes('returned no judges. Please try again.')) { // no paradigms
                    console.log('no paradigms found')
                    resApp.status(404).send('no paradigms found')
                } else if (res.text.includes('Paradigm search results')) { // multiple paradigms - prob wont be used but just in case someone submits a link with first & last name
                    console.log('multiple people')
                    let promiseRequestArr = []
                    const $ = cheerio.load(res.text)
                    if (req.body.all === 'false') {
                        superagent
                            .get(`https://www.tabroom.com/index/${$($($('#paradigm_search').children('tbody').children('tr')[0]).children('td')[3]).children('a').attr('href')}`)
                            .set('User-Agent', useragent)
                            .end(async (err, res) => {
                                if (err) return resApp.status(500).send(err)
                                paradigm.push(await paradigmProcessing(res.text, req.body.paradigmOnly))
                                resApp.send(paradigm)
                            })

                    } else {
                        for (i = 0; i < $('#paradigm_search').children('tbody').children('tr').length; i++) {
                            promiseRequestArr.push(multiRequest(`https://www.tabroom.com/index/${$($($('#paradigm_search').children('tbody').children('tr')[i]).children('td')[3]).children('a').attr('href')}`, req, useragent))
                        }
                        Promise.all(promiseRequestArr).then((values) => {
                            resApp.send(values)
                        })
                    }
                } else { // single paradigm page
                    console.log('single paradigm')
                    paradigm.push(await paradigmProcessing(res.text, req.body.paradigmOnly))
                    resApp.send(paradigm)
                }

            })
    }

})

async function multiRequest(link, req, useragent) {
    return new Promise((resolve, reject) => {
        superagent
            .get(link)
            .set('User-Agent', useragent)
            .end(async (err, res) => {
                if (err) reject(err)
                resolve(await paradigmProcessing(res.text, req.body.paradigmOnly))
            })
    })
}

async function paradigmProcessing(html, paradigmOnly) {

    /*
    return schema:
    {
        paradigm: string,
        judgeRecords: []
    }
    */

    const $ = cheerio.load(html)
    let paradigmText = $('.paradigm .ltborderbottom').text().trim()
    let judgeName = $('#content div.main h3').text()

    if (paradigmOnly === 'true') {
        return ({
            paradigm: paradigmText,
            name: judgeName
        })
    } else {
        const converted = tabletojson.convert(html)
        return ({
            paradigm: paradigmText,
            name: judgeName,
            judgeRecords: converted
        })
    }
}

module.exports = router
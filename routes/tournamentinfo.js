const cheerio = require('cheerio')
const superagent = require('superagent')
const express = require('express')
const router = express.Router()

router.post('/', async (req, resApp) => {
    
    var authKeys = req.app.get('authKeys')
    if (!require('../helpers/auth').verifyAuth(authKeys, req, resApp)) return

    // input: api auth, any link with tournament id
    var tournamentID = req.body.link.match(/tourn_id=(\d+)/g)[0].replace('tourn_id=', '')

    function tournInfoGetEvent() {
        // return promise in function
        return new Promise((resolve, reject) => {
            superagent
                .get(req.body.link)
                .end((err, res) => {
                    if (err && err.status !== 302) reject(err)
                    var $ = cheerio.load(res.text)
                    resolve($($('.sidenote').children('.dkblue')[0]).text().trim() === '' ? undefined : $($('.sidenote').children('.dkblue')[0]).text().trim())
                })
        })
    }

    superagent
        .get(`https://www.tabroom.com/index/tourn/index.mhtml?tourn_id=${tournamentID}`)
        .end(async (err, res) => {
            if (err && err.status !== 302) resApp.status(500).send(`Error ${err}`)
            var $ = cheerio.load(res.text)
            var returnPayload = {
                tournName: $('div.main').children('h2').text().trim(),
                startDateUnix: null,
                endDateUnix: null
            }
            if (req.body.link.includes('event_id')) returnPayload.event = await tournInfoGetEvent() // fetch event if the link provided has an event_id
            var tournYear = $('div.main').children('h5').text().trim().substring(0, 4)
            var timeZone = $($('div.menu').children('div.sidenote')[1]).children('span.third.explain').text().trim().replace('Times in ', '')
            var rawTime = $($($('div.menu').children('div.sidenote')[1]).children('div.row').children('span.smaller')[1]).text().trim().replace(/\n/g, '').replace(/\t/g, '').replace(/ /g, '').split('to')
            if (rawTime.length === 2) { // start end on different days, there used to be a "to" seperator
                returnPayload.startDateUnix = new Date(`${rawTime[0]}/${tournYear} 00:00 ${timeZone}`).getTime()
                returnPayload.endDateUnix = new Date(`${rawTime[1]}/${tournYear} 23:59 ${timeZone}`).getTime()
            } else if (rawTime.length === 1) {
                returnPayload.startDateUnix = new Date(`${rawTime[0]}/${tournYear} 00:00 ${timeZone}`).getTime()
                returnPayload.endDateUnix = new Date(`${rawTime[0]}/${tournYear} 23:59 ${timeZone}`).getTime()
            }
            resApp.send(returnPayload)
        })

})

module.exports = router

const superagent = require('superagent')
const cheerio = require('cheerio')

function paradigmWorkWithRequest(req, judgeLink) {
    return new Promise((resolve, reject) => {
        superagent
            .get(judgeLink)
            .end((err, res) => {
                if (err) reject(err)
                var $ = cheerio.load(res.text)

                var roundJudgedInfo = null
                var judgeRecord = []
                judgeRecord.push($('.paradigm').text())
                judgeRecord.push($('.paradigm').html().replace(/<p>/gmi, "").replace(/<\/p>/gmi, ""))
                if (judgeLink) judgeRecord.push(judgeLink)
                if (req.body.short == 'true') {
                    // resApp.send(judgeRecord)
                    // return;
                    // console.log(`here`)
                    resolve(judgeRecord)
                    return;
                }

                // round judged limit 
                var roundJudgedLen = null
                if (req.body.roundLimit != undefined) {
                    if (req.body.roundLimit > 200) {
                        roundJudgedLen = Math.min(parseInt($('#record').children('tbody').children('tr').length), 200)
                    } else if (req.body.roundLimit <= 200) {
                        roundJudgedLen = Math.min(parseInt($('#record').children('tbody').children('tr').length), req.body.roundLimit)
                    }
                } else {
                    roundJudgedLen = Math.min(parseInt($('#record').children('tbody').children('tr').length), 200)
                }

                for (i = 0; i < roundJudgedLen; i++) {
                    roundJudgedInfo = {
                        "tournament": "",
                        "date": "",
                        "timestamp": "",
                        "event": "",
                        "round": "",
                        "affTeamCode": "",
                        "negTeamCode": "",
                        "judgeVote": "",
                        "result": ""
                    }

                    if (req.body.basecamp == 'true') {
                        roundJudgedInfo.timestamp = $($('#record').children('tbody').children('tr')[i]).children('td')[2].children.find(child => child.name == 'span').children.find(child => child.type == 'text').data.trim()

                        roundJudgedInfo.judgeVote = $($('#record').children('tbody').children('tr')[i]).children('td')[7].children.find(child => child.type == 'text').data.trim()

                        roundJudgedInfo.event = $($('#record').children('tbody').children('tr')[i]).children('td')[3].children.find(child => child.type == 'text').data.trim()
                    } else {
                        roundJudgedInfo.tournament = $($('#record').children('tbody').children('tr')[i]).children('td')[0].children.find(child => child.name == 'a').children.find(child => child.type == 'text').data.trim()

                        roundJudgedInfo.level = $($($('#record').children('tbody').children('tr')[i]).children('td')[1]).text().trim()

                        roundJudgedInfo.date = $($('#record').children('tbody').children('tr')[i]).children('td')[2].children.find(child => child.name == 'span').next.data.trim()

                        roundJudgedInfo.timestamp = $($('#record').children('tbody').children('tr')[i]).children('td')[2].children.find(child => child.name == 'span').children.find(child => child.type == 'text').data.trim()

                        roundJudgedInfo.event = $($('#record').children('tbody').children('tr')[i]).children('td')[3].children.find(child => child.type == 'text').data.trim()

                        roundJudgedInfo.round = $($('#record').children('tbody').children('tr')[i]).children('td')[4].children.find(child => child.name == 'a').children.find(child => child.type == 'text').data.trim()

                        roundJudgedInfo.affTeamCode = $($('#record').children('tbody').children('tr')[i]).children('td')[5].children.find(child => child.name == 'a').children.find(child => child.type == 'text').data.trim()

                        roundJudgedInfo.negTeamCode = $($('#record').children('tbody').children('tr')[i]).children('td')[6].children.find(child => child.name == 'a').children.find(child => child.type == 'text').data.trim()

                        roundJudgedInfo.judgeVote = $($('#record').children('tbody').children('tr')[i]).children('td')[7].children.find(child => child.type == 'text').data.trim()

                        roundJudgedInfo.result = $($('#record').children('tbody').children('tr')[i]).children('td')[8].children.find(child => child.type == 'text').data.trim().replace(/\n/g, "").replace(/\t+/g, " ")

                    }
                    judgeRecord.push(roundJudgedInfo)

                }
                resolve(judgeRecord)
            })
    })
}

function paradigmWork(req, $, judgeLink) {
    var roundJudgedInfo = null
    var judgeRecord = []
    judgeRecord.push($('.paradigm').text())
    judgeRecord.push($('.paradigm').html().replace(/<p>/gmi, "").replace(/<\/p>/gmi, ""))
    if (judgeLink) judgeRecord.push(judgeLink)
    if (req.body.short == 'true') {
        return (judgeRecord)
    }

    // round judged limit 
    var roundJudgedLen = null
    if (req.body.roundLimit != undefined) {
        if (req.body.roundLimit > 200) {
            roundJudgedLen = Math.min(parseInt($('#record').children('tbody').children('tr').length), 200)
        } else if (req.body.roundLimit <= 200) {
            roundJudgedLen = Math.min(parseInt($('#record').children('tbody').children('tr').length), req.body.roundLimit)
        }
    } else {
        roundJudgedLen = Math.min(parseInt($('#record').children('tbody').children('tr').length), 200)
    }

    for (i = 0; i < roundJudgedLen; i++) {
        roundJudgedInfo = {
            "tournament": "",
            "date": "",
            "timestamp": "",
            "event": "",
            "round": "",
            "affTeamCode": "",
            "negTeamCode": "",
            "judgeVote": "",
            "result": ""
        }

        if (req.body.basecamp == 'true') {
            roundJudgedInfo.timestamp = $($('#record').children('tbody').children('tr')[i]).children('td')[2].children.find(child => child.name == 'span').children.find(child => child.type == 'text').data.trim()

            roundJudgedInfo.judgeVote = $($('#record').children('tbody').children('tr')[i]).children('td')[7].children.find(child => child.type == 'text').data.trim()

            roundJudgedInfo.event = $($('#record').children('tbody').children('tr')[i]).children('td')[3].children.find(child => child.type == 'text').data.trim()
        } else {
            roundJudgedInfo.tournament = $($('#record').children('tbody').children('tr')[i]).children('td')[0].children.find(child => child.name == 'a').children.find(child => child.type == 'text').data.trim()

            roundJudgedInfo.level = $($($('#record').children('tbody').children('tr')[i]).children('td')[1]).text().trim()

            roundJudgedInfo.date = $($('#record').children('tbody').children('tr')[i]).children('td')[2].children.find(child => child.name == 'span').next.data.trim()

            roundJudgedInfo.timestamp = $($('#record').children('tbody').children('tr')[i]).children('td')[2].children.find(child => child.name == 'span').children.find(child => child.type == 'text').data.trim()

            roundJudgedInfo.event = $($('#record').children('tbody').children('tr')[i]).children('td')[3].children.find(child => child.type == 'text').data.trim()

            roundJudgedInfo.round = $($('#record').children('tbody').children('tr')[i]).children('td')[4].children.find(child => child.name == 'a').children.find(child => child.type == 'text').data.trim()

            roundJudgedInfo.affTeamCode = $($('#record').children('tbody').children('tr')[i]).children('td')[5].children.find(child => child.name == 'a').children.find(child => child.type == 'text').data.trim()

            roundJudgedInfo.negTeamCode = $($('#record').children('tbody').children('tr')[i]).children('td')[6].children.find(child => child.name == 'a').children.find(child => child.type == 'text').data.trim()

            roundJudgedInfo.judgeVote = $($('#record').children('tbody').children('tr')[i]).children('td')[7].children.find(child => child.type == 'text').data.trim()

            roundJudgedInfo.result = $($('#record').children('tbody').children('tr')[i]).children('td')[8].children.find(child => child.type == 'text').data.trim().replace(/\n/g, "").replace(/\t+/g, " ")

        }

        /** Debugging
         * break;
         */

        judgeRecord.push(roundJudgedInfo)

    }
    return (judgeRecord)
}

function start(req, requestLink, cb) {
    if (req.body.first != undefined) {
        superagent
            .post(requestLink)
            .set('Content-Type', 'application/x-www-form-urlencoded')
            .redirects(0)
            .send(JSON.parse(`{"search_first": "${req.body.first}", "search_last": "${req.body.last}"}`))
            .end((err, res) => {
                if (err) cb(err)
                var $ = cheerio.load(res.text)
                var returnData = []

                /**
                 * loop: i->table len. Count votes while stuffing tournament info in json objs stuffed in an array
                 */
                if (res.text.includes(`returned no judges with paradigms.`)) {
                    cb(null, 204)
                    return;
                }
                if (res.text.includes(`Paradigm search results`)) { // multiple results from search
                    var judgeLink = ""
                    for (x = 0; x < $("#paradigm_search").children('tbody').children('tr').length; x++) { // check how many results would result
                        judgeLink = "https://www.tabroom.com/index/" + $($($("#paradigm_search").children('tbody').children('tr')[x]).children('td')[3]).children('a')[0].attribs.href
                        returnData.push(paradigmWorkWithRequest(req, judgeLink))
                    }
                    Promise.all(returnData).then(val => {
                        cb(null, val)
                        return;
                    })
                } else {
                    // returnData = 
                    // return (paradigmWork(req, $))
                    cb(null, paradigmWork(req, $))
                    return;
                }

            })
    }
    else {
        superagent
            .get(requestLink)
            .redirects(0)
            .end((err, res) => {
                if (err) cb(err)
                var $ = cheerio.load(res.text)
                /**
                 * loop: i->table len. Count votes while stuffing tournament info in json objs stuffed in an array
                 */
                if (res.text.includes(`returned no judges with paradigms.`)) {
                    cb(null, 204)
                    return;
                }
                var roundJudgedInfo = null
                var judgeRecord = []
                judgeRecord.push($('.paradigm').text())
                judgeRecord.push($('.paradigm').html().replace(/<p>/gmi, "").replace(/<\/p>/gmi, ""))

                if (req.body.short == 'true') {
                    cb(null, judgeRecord)
                    return;
                }

                // round judged limit to 170 rounds
                if (req.body.roundLimit != undefined) {
                    if (req.body.roundLimit > 200) {
                        roundJudgedLen = Math.min(parseInt($('#record').children('tbody').children('tr').length), 200)
                    } else if (req.body.roundLimit <= 200) {
                        roundJudgedLen = Math.min(parseInt($('#record').children('tbody').children('tr').length), req.body.roundLimit)
                    }
                } else {
                    roundJudgedLen = Math.min(parseInt($('#record').children('tbody').children('tr').length), 200)
                }

                for (i = 0; i < roundJudgedLen; i++) {
                    roundJudgedInfo = {
                        "tournament": "",
                        "level": "",
                        "date": "",
                        "timestamp": "",
                        "event": "",
                        "round": "",
                        "affTeamCode": "",
                        "negTeamCode": "",
                        "judgeVote": "",
                        "result": ""
                    }

                    if (req.body.basecamp == 'true') {
                        roundJudgedInfo.timestamp = $($('#record').children('tbody').children('tr')[i]).children('td')[2].children.find(child => child.name == 'span').children.find(child => child.type == 'text').data.trim()

                        roundJudgedInfo.judgeVote = $($('#record').children('tbody').children('tr')[i]).children('td')[7].children.find(child => child.type == 'text').data.trim()

                        roundJudgedInfo.event = $($('#record').children('tbody').children('tr')[i]).children('td')[3].children.find(child => child.type == 'text').data.trim()
                    } else {
                        roundJudgedInfo.tournament = $($('#record').children('tbody').children('tr')[i]).children('td')[0].children.find(child => child.name == 'a').children.find(child => child.type == 'text').data.trim()

                        roundJudgedInfo.level = $($($('#record').children('tbody').children('tr')[i]).children('td')[1]).text().trim()

                        roundJudgedInfo.date = $($('#record').children('tbody').children('tr')[i]).children('td')[2].children.find(child => child.name == 'span').next.data.trim()

                        roundJudgedInfo.timestamp = $($('#record').children('tbody').children('tr')[i]).children('td')[2].children.find(child => child.name == 'span').children.find(child => child.type == 'text').data.trim()

                        roundJudgedInfo.event = $($('#record').children('tbody').children('tr')[i]).children('td')[3].children.find(child => child.type == 'text').data.trim()

                        roundJudgedInfo.round = $($('#record').children('tbody').children('tr')[i]).children('td')[4].children.find(child => child.name == 'a').children.find(child => child.type == 'text').data.trim()

                        roundJudgedInfo.affTeamCode = $($('#record').children('tbody').children('tr')[i]).children('td')[5].children.find(child => child.name == 'a').children.find(child => child.type == 'text').data.trim()

                        roundJudgedInfo.negTeamCode = $($('#record').children('tbody').children('tr')[i]).children('td')[6].children.find(child => child.name == 'a').children.find(child => child.type == 'text').data.trim()

                        roundJudgedInfo.judgeVote = $($('#record').children('tbody').children('tr')[i]).children('td')[7].children.find(child => child.type == 'text').data.trim()

                        roundJudgedInfo.result = $($('#record').children('tbody').children('tr')[i]).children('td')[8].children.find(child => child.type == 'text').data.trim().replace(/\n/g, "").replace(/\t+/g, " ")

                    }
                    judgeRecord.push(roundJudgedInfo)
                }
                cb(null, judgeRecord)
                return;
            })
    }
}
module.exports = {
    start: start
}
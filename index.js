const express = require('express')
const cheerio = require('cheerio');
const superagent = require('superagent');
const apiKey = require('./apiKeys.json')
const fs = require('fs')
var cookieParser = require('cookie-parser');
var app = express()
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(cookieParser())

/**
 * @todo app.get('/tournamentInfo) -> entries, judges.. pairings? results? encourages mass requests?
 * @todo app.get('/me/current') -> current entries (ref old html saves of active entries?)
 */
function tabroomTokenTest(req, resApp) {
    return new Promise((resolve, reject) => {
        superagent
            .get('https://www.tabroom.com/user/student/index.mhtml')
            .set("Cookie", req.body.token)
            .redirects(0)
            .end((err, res) => {
                if (res.text.includes('Your login session has expired.  Please log in again.')) { // token expired
                    resApp.status(403)
                    resApp.send(`Tabroom.com token is out of date, please run /login again to get token.`)
                    resolve(false)
                }
                else {
                    resolve(true)
                }
            })
    })
}

if (process.env.PORT == null || process.env.PORT == "") { // for dev purposes
    app.use(function (req, res, next) {
        res.header("Access-Control-Allow-Origin", "*");
        // res.header("Access-Control-Allow-Origin", "file:///Users/jim/Documents/NSDA-to-Jitsi-Desktop/index.html");
        res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
        next();
    })
}

app.get('/_ah/warmup', (req, resApp) => { // google cloud warmup request: https://cloud.google.com/appengine/docs/standard/nodejs/configuring-warmup-requests
    app.use(function (req, res, next) {
        res.header("Access-Control-Allow-Origin", "*");
        // res.header("Access-Control-Allow-Origin", "file:///Users/jim/Documents/NSDA-to-Jitsi-Desktop/index.html");
        res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
        next();
    })
    resApp.sendStatus(200)
})

app.post('/login', (req, resApp) => {
    /**
    * @param {Object} -> Username: Tabroom email & Password: Tabroom password EX: { username: 'yfang@ex.org', password: 'password' } - Encode: X-WWW-FORM-URLENCODED
    * @returns {Object} -> Token: Tabroom Token (Format: Cookie) & Expiration: Tabroom Token Expiration Date (GMT)
    * Note this is unsecure as it requires a user's raw credentials to be passed to a server. authentication should be done on the client side using the same method here.
    */

    if (!apiKey.includes(req.body.apiauth)) {
        resApp.status(401)
        resApp.send('Invalid API Key or no authentication provided.')
        return;
    }

    let resData = null;
    superagent
        .post('https://www.tabroom.com/user/login/login_save.mhtml')
        .set('Content-Type', 'application/x-www-form-urlencoded')
        .redirects(0)
        .send(req.body)
        .end((err, res) => {
            /** Debugging
             * console.log(err)
             * console.log(res.headers)
             * console.log(res.headers["set-cookie"][res.headers["set-cookie"].length - 1])
             */
            resData = {
                "token": res.headers["set-cookie"][res.headers["set-cookie"].length - 1],
                "expiration": res.headers["set-cookie"][res.headers["set-cookie"].length - 1].substring(res.headers["set-cookie"][res.headers["set-cookie"].length - 1].indexOf('expires=') + "expires=".length, res.headers["set-cookie"][res.headers["set-cookie"].length - 1].indexOf("; secure"))
            }
            resApp.send(resData)
        })
})


app.post('/test', (req, resApp) => {
    if (!apiKey.includes(req.body.apiauth)) {
        resApp.status(401)
        resApp.send('Invalid API Key or no authentication provided.')
        return;
    } else {
        resApp.send('Test Successful')
    }
})

// this probably needs to be split in to a seperate function 
app.post('/me/test', async (req, resApp) => {
    if (!apiKey.includes(req.body.apiauth)) {
        resApp.status(401)
        resApp.send('Invalid API Key or no authentication provided.')
        return;
    }
    if (await tabroomTokenTest(req, resApp)) {
        resApp.send('Test Successful')
    }

})

app.post('/me', async function (req, resApp) {
    // @todo app.get('/me') -> NSDA pts, district tournaments? membership #, membership # affiliation school, name, email, timezone, pronouns
    if (!apiKey.includes(req.body.apiauth)) {
        resApp.status(401)
        resApp.send('Invalid API Key or no authentication provided.')
        return;
    }
    const { nsda, profile } = require('./modules/me')

    Promise.all([nsda(req), profile(req)]).then((val) => {
        resApp.send({ ...val[0], ...val[1] })
    })
})

app.post('/me/results', async function (req, resApp) { // update docs, return format changed.
    /**
     * @param {Object} -> Token: Tabroom Token as returned by the /login endpoint - Encode: X-WWW-FORM-URLENCODED - USE "token" FOR X-WWW-FORM-URLENCODED KEY & Short: a integer representing the number of months to go back when collecting records. Ex: short = 2 will only collect records from tournnaments that were held 2 months ago from today. Encode: X-WWW-FORM-URLENCODED - USE "short" FOR X-WWW-FORM-URLENCODED KEY
     *  {'token': 'Tabroom.com token', 'short': '2'}
     * @returns {Object} -> Token bearer's past competition history in JSON format
     * @description Might be for policy tab accounts only - non policy accounts may have different formatting in the results page (especially speech)
     *  Navigation of returned Object: https://stackoverflow.com/a/42097380/9108905
     */

    if (!apiKey.includes(req.body.apiauth)) {
        resApp.status(401)
        resApp.send('Invalid API Key or no authentication provided.')
        return;
    }

    if (!tabroomTokenTest(req, resApp)) return

    const { basicInfo } = require('./modules/results')
    basicInfo(req).then((val, err) => {
        if (err) {
            console.error(err)
            resApp.status(500)
            resApp.send(err)
        }
        resApp.send(val)
    })
})



app.post('/me/future', (req, resApp) => { //CHANGED
    /**
     * @param {Object} -> Token: User's Tabroom.com token - Encode: X-WWW-FORM-URLENCODED - USE "token" FOR X-WWW-FORM-URLENCODED KEY
     *  {'token': 'Tabroom.com Token'}
     * @returns {Array} -> [...<n> future tournaments...] - Order: Most recent one first, as appears on tabroom.com
     */

    if (!apiKey.includes(req.body.apiauth)) {
        resApp.status(401)
        resApp.send('Invalid API Key or no authentication provided.')
        return;
    }

    if (!tabroomTokenTest(req, resApp)) return

    superagent
        .get('https://www.tabroom.com/user/student/index.mhtml?default=future')
        .set("Cookie", req.body.token)
        .redirects(0)
        .end((err, res) => {
            // var $ = cheerio.load(res.text)
            var $ = cheerio.load(fs.readFileSync(`./dev/Tabroom.com ASU rd5 included.html`))

            var futureList = []
            var futureTournament = null

            for (i = 0; i < $('#upcoming').children('tbody').children('tr').length; i++) {
                futureTournament = {
                    "name": '',
                    "location": '',
                    "date": '',
                    "event": '',
                    "eventLink": '',
                    "info": '',
                    "status": '',
                    "prefs": '',
                    "notes": ''
                }

                futureTournament.name = $($($('#upcoming').children('tbody').children('tr')[i]).children('td')[0]).children('div')[0].children.find(child => child.type == 'text').data.trim()

                futureTournament.location = $($($($('#upcoming').children('tbody').children('tr')[i]).children('td')[0]).children('div')[1]).text().trim().replace(/\n/g, " ").replace(/\t/g, "")

                futureTournament.date = $($($('#upcoming').children('tbody').children('tr')[i]).children('td')[1]).text().trim()

                futureTournament.event = $($($('#upcoming').children('tbody').children('tr')[i]).children('td')[2]).text().trim()

                futureTournament.eventLink = "https://www.tabroom.com" + $($($('#upcoming').children('tbody').children('tr')[i]).children('td')[2]).children('a')[0].attribs.href

                futureTournament.info = $($($('#upcoming').children('tbody').children('tr')[i]).children('td')[3]).text().trim()

                futureTournament.status = $($($('#upcoming').children('tbody').children('tr')[i]).children('td')[4]).text().trim()

                futureTournament.prefs = $($($('#upcoming').children('tbody').children('tr')[i]).children('td')[5]).text().trim().replace(/\n/g, " ").replace(/\t/g, "")

                futureTournament.notes = $($($('#upcoming').children('tbody').children('tr')[i]).children('td')[6]).text().trim().replace(/\n/g, " ").replace(/\t/g, "")

                futureList.push(futureTournament)
            }

            if (futureList.length === 0) {
                resApp.sendStatus(204)
                // resApp.send('No future entries')
            } else {
                resApp.send(futureList)
            }
        })

})

app.post('/me/current', function (req, resApp) { // docs - input token & api auth || **CHANGED**
    if (!apiKey.includes(req.body.apiauth)) {
        resApp.status(401)
        resApp.send('Invalid API Key or no authentication provided.')
        return;
    }
    const { basicTournamentInfo } = require('./modules/current')
    Promise.all([basicTournamentInfo(req.body.token)]).then(val => { // could use async await here
        if (val[0] === 204) {
            resApp.sendStatus(204)
        } else {
            resApp.send(val[0])
        }
    }).catch(err => {
        console.error(err)
    })


})


app.post('/paradigm', (req, resApp) => {
    /**
     * @param {object} -> EITHER:
     *  {type: "name", first: "john", last: "appleseed"}
     *  {type: "id", id: "1234"}
     *  {type: "link", link: "https://www.tabroom.com/index/paradigm.mhtml?judge_person_id=6606"}
     * @returns {Array}: ["Raw Paradigm Text", "Paradigm Text w/ HTML Markup", ...judging records...]
     */

    if (!apiKey.includes(req.body.apiauth)) {
        resApp.status(401)
        resApp.send('Invalid API Key or no authentication provided.')
        return;
    }
    var requestLink = ""
    if (req.body.type === 'name') {
        requestLink = `https://www.tabroom.com/index/paradigm.mhtml`
    } else if (req.body.type === 'id') {
        requestLink = `https://www.tabroom.com/index/paradigm.mhtml?judge_person_id=${req.body.id}`
    } else if (req.body.type === 'link') {
        requestLink = req.body.link
    }
    const { start } = require('./modules/paradigm')
    start(req, requestLink, (err, res) => {
        if (err) {
            resApp.sendStatus(500)
            resApp.send(err)
        }
        if (res === 204) {
            resApp.sendStatus(204)
        } else {
            resApp.send(res)
        }
    })
})

app.post('/upcoming', (req, resApp) => {

    if (!apiKey.includes(req.body.apiauth)) {
        resApp.status(401)
        resApp.send('Invalid API Key or no authentication provided.')
        return;
    }

    superagent
        .get('https://www.tabroom.com/index/index.mhtml')
        .end((err, res) => {
            var $ = cheerio.load(res.text)

            var upcomingTournaments = []
            var tournament = null

            for (i = 0; i < $('#tournlist').children('tbody').children('tr').length; i++) {
                tournament = {
                    "date": null,
                    "name": null,
                    "tournamentID": null,
                    "city": null,
                    "stateCountry": null,
                    "reg": null
                }

                tournament.date = $($($('#tournlist').children('tbody').children('tr')[i]).children('td')[0]).text().trim().replace(/\t/g, "").replace(/\n/g, "").replace($($($('#tournlist').children('tbody').children('tr')[i]).children('td')[0]).children().text().trim(), "")

                tournament.name = $($($('#tournlist').children('tbody').children('tr')[i]).children('td')[1]).children('a').text().trim().replace(/\n/g, " ").replace(/\t/g, "")

                tournament.tournamentID = $($('#tournlist').children('tbody').children('tr')[i]).children('td')[1].children.find(child => child.name == 'a').attribs.href.substring($($('#tournlist').children('tbody').children('tr')[i]).children('td')[1].children.find(child => child.name == 'a').attribs.href.indexOf('tourn_id=') + 9)

                tournament.city = $($('#tournlist').children('tbody').children('tr')[i]).children('td')[2].children.find(child => child.type == 'text').data.trim()

                try {
                    tournament.stateCountry = $($('#tournlist').children('tbody').children('tr')[i]).children('td')[3].children.find(child => child.name == 'a').children.find(child => child.type == 'text').data.trim()
                } catch (err) {
                    tournament.stateCountry = ""
                }

                tournament.reg = $($($($('#tournlist').children('tbody').children('tr')[i]).children('td')[4]).children('a')[0]).text().trim().replace(/\n/g, " ").replace(/\t/g, "")

                // break;

                upcomingTournaments.push(tournament)
            }
            resApp.send(upcomingTournaments)
        })
})


app.post('/codeExtract', (req, resApp) => { // req: apiauth, tournament link, code, find the entries link, and then add the event id on there :facepalm:
    if (!apiKey.includes(req.body.apiauth)) {
        resApp.status(401)
        resApp.send('Invalid API Key or no authentication provided.')
        return;
    }
    if (!req.body.eventLink.includes('event_id')) { // link such as this: https://www.tabroom.com/index/tourn/index.mhtml?tourn_id=20262
        superagent
            .get(`https://www.tabroom.com/index/tourn/events.mhtml?tourn_id=${req.body.eventLink.replace('https://www.tabroom.com/index/tourn/index.mhtml?tourn_id=', "")}`)
            .redirects(0)
            .end((err, res) => {
                var $ = cheerio.load(res.text)
                var eventLinks = []
                eventLinks.push((`https://www.tabroom.com/index/tourn/${$($('[class="dkblue half nowrap marvertno"]')[0]).attr('href')}`).replace('events', 'fields'))
                for (i = 0; i < $('[class="blue half nowrap marvertno"]').length; i++) {
                    eventLinks.push((`https://www.tabroom.com/index/tourn/${$($('[class="blue half nowrap marvertno"]')[i]).attr('href')}`).replace('events', 'fields'))
                }

                // eventSearchDeliver(req, eventLinks, resApp)
                var searchResults = []
                for (i = 0; i < eventLinks.length; i++) {
                    searchResults.push(eventSearch(req, eventLinks[i]))
                }
                // https://medium.com/@chrisjr06/why-and-how-to-avoid-await-in-a-for-loop-32b86722171
                Promise.all(searchResults).then(val => {
                    resApp.send(val.filter(x => x != undefined))
                })
            })

        function eventSearch(req, link) {
            return new Promise((resolve, reject) => {
                superagent
                    .get(link)
                    .redirects(0)
                    .end((err, res) => {
                        var $ = cheerio.load(res.text)
                        for (i = 0; i < $('.main').children('table').children('tbody').children().length; i++) {
                            if (req.body.code === $($($('.main').children('table').children('tbody').children('tr')[i]).children('td')[3]).text().trim()) {
                                resolve({
                                    "school": $($($('.main').children('table').children('tbody').children('tr')[i]).children('td')[0]).text().trim(),
                                    "locale": $($($('.main').children('table').children('tbody').children('tr')[i]).children('td')[1]).text().trim(),
                                    "entry": $($($('.main').children('table').children('tbody').children('tr')[i]).children('td')[2]).text().trim(),
                                    "code": $($($('.main').children('table').children('tbody').children('tr')[i]).children('td')[3]).text().trim(),
                                    "status": $($($('.main').children('table').children('tbody').children('tr')[i]).children('td')[4]).text().trim()
                                })
                                return;
                            }
                        }
                        resolve()
                    })
            })
        }
    } else {  // if this is an event link

        superagent
            .get(req.body.eventLink)
            .redirects(0)
            .end((err, res) => {
                var $ = cheerio.load(res.text)


                var entryRequestLink = "https://www.tabroom.com" + $('#tabnav > li:nth-child(2) > a')[0].attribs.href + "&event_id=" + req.body.eventLink.substring(req.body.eventLink.indexOf('event_id=') + 9)

                console.log(entryRequestLink)

                superagent
                    .get(entryRequestLink)
                    .redirects(0)
                    .end((err, resSecond) => {
                        var $ = cheerio.load(resSecond.text)

                        for (i = 0; i < $('.main').children('table').children('tbody').children().length; i++) {

                            if (req.body.code === $($($('.main').children('table').children('tbody').children('tr')[i]).children('td')[3]).text().trim()) {
                                resApp.send({
                                    "school": $($($('.main').children('table').children('tbody').children('tr')[i]).children('td')[0]).text().trim(),
                                    "locale": $($($('.main').children('table').children('tbody').children('tr')[i]).children('td')[1]).text().trim(),
                                    "entry": $($($('.main').children('table').children('tbody').children('tr')[i]).children('td')[2]).text().trim(),
                                    "code": $($($('.main').children('table').children('tbody').children('tr')[i]).children('td')[3]).text().trim(),
                                    "status": $($($('.main').children('table').children('tbody').children('tr')[i]).children('td')[4]).text().trim()
                                })
                                return;
                            }

                        }
                        resApp.status(404)
                        resApp.send(`Entry not found.`)
                    })

            })
    }
    // add functionality to get entries from links like: https://www.tabroom.com/index/tourn/fields.mhtml?tourn_id=20262&event_id=175214

})

app.post('/getprelimrecord', (req, resApp) => {
    // input: eventLink with event id, team/oppoent code
    if (!apiKey.includes(req.body.apiauth)) {
        resApp.status(401)
        resApp.send('Invalid API Key or no authentication provided.')
        return;
    }

    superagent
        .get(req.body.eventLink)
        .redirects(0)
        .end((err, res) => {
            var $ = cheerio.load(res.text)
            var link = null

            for (i = 0; i < $('.sidenote').children('a').length; i++) {
                if ($('.sidenote').children('a')[i].attribs.class.includes('dkblue')) {
                    link = "https://www.tabroom.com/index/tourn/" + $('.sidenote').children('a')[i].attribs.href.replace('events.mhtml?', 'results/ranked_list.mhtml?')
                    break;
                }
            }

            superagent
                .get(link)
                .redirects(10)
                .end((err, res) => {

                    var $ = cheerio.load(res.text)
                    for (i = 0; i < $('#ranked_list').children('tbody').children('tr').length; i++) {
                        if ($($($('#ranked_list').children('tbody').children('tr')[i]).children('td')[2]).text().trim() === req.body.code) {
                            resApp.send({
                                "recordW": $($($('#ranked_list').children('tbody').children('tr')[i]).children('td')[0]).text().trim(),
                                "recordL": "" + ($("#ranked_list_buttonarea").text().trim() - $($($('#ranked_list').children('tbody').children('tr')[i]).children('td')[0]).text().trim()),
                                "recordLink": "https://www.tabroom.com" + ($($('#ranked_list').children('tbody').children('tr')[i]).children('td')[2].children.find(child => child.name === 'a').attribs.href)
                            })
                            return;
                        }
                    }
                    resApp.status(404)
                    resApp.send('Not Found')

                })
        })
})

app.post('/jitsiurl', (req, resApp) => {
    // input: jwt key, tabroomapi auth token
    if (!apiKey.includes(req.body.apiauth)) {
        resApp.status(401)
        resApp.send('Invalid API Key or no authentication provided.')
        return;
    }

    superagent
        .post('https://campus.speechanddebate.org/')
        .set('Content-Type', 'application/x-www-form-urlencoded')
        .send(JSON.parse(`{"json":"${req.body.jwt}"}`))
        .redirects(10)
        .end((err, res) => {
            var $ = cheerio.load(res.text)
            var scriptStr = $("script:nth-child(5)", "body").html()
            var uuid = scriptStr.match(/uuid:"(?:\d+[a-z]|[a-z]+\d)[a-z\d]*"/g)[0].replace('uuid:"', "").replace('"', "")
            var jwt = scriptStr.match(/jwt:"([a-zA-Z0-9._-])*"/gm)[0].replace('jwt:"', "").replace('"', "")
            resApp.send(`https://meet-west.speechanddebate.org/${uuid}?jwt=${jwt}`)
        })

})


port = process.env.PORT;
if (port == null || port == "") {
    port = 8080;
}
app.listen(port)
console.log(`Listening at http://localhost:${port}`)
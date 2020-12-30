const express = require('express')
const { response } = require('express');
const cheerio = require('cheerio');
const superagent = require('superagent');
const apiKey = require('./apiKeys.json')
var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser')
var app = express()
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))
app.use(cookieParser())

/**
 * @todo app.get('/tournamentInfo) -> entries, judges.. pairings? results? encourages mass requests?
 * @todo app.get('/me/current') -> current entries (ref old html saves of active entries?)
 */


app.post('/login', (req, resApp) => {
    /**
    * @param {Object} -> Username: Tabroom email & Password: Tabroom password EX: { username: 'yfang@ex.org', password: 'password' } - Encode: X-WWW-FORM-URLENCODED
    * @returns {Object} -> Token: Tabroom Token (Format: Cookie) & Expiration: Tabroom Token Expiration Date (GMT)
    */

    if (!apiKey.includes(req.body.apiauth)) {
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


app.get('/test', (req, resApp) => {
    if (!apiKey.includes(req.body.apiauth)) {
        resApp.send('Invalid API Key or no authentication provided.')
        return;
    }
})

app.get('/me', async function (req, resApp) {
    // @todo app.get('/me') -> NSDA pts, district tournaments? membership #, membership # affiliation school, name, email, timezone, pronouns
    if (!apiKey.includes(req.body.apiauth)) {
        resApp.send('Invalid API Key or no authentication provided.')
        return;
    }

    nsda(req, resApp)
    async function nsda(req, resApp) {
        superagent
            .get('https://www.tabroom.com/user/student/nsda.mhtml')
            .set("Cookie", req.body.token)
            .end(async (err, res) => {
                var $ = cheerio.load(res.text)

                var userInfo = {
                    'nsdaMemberNumber': null,
                    'nsdaPoints': null,
                    'districtTournament': null,
                    'nsdaAffiliation': null,
                    'latestNsdaHonor': null,
                    'latestNsdaHonorDate': null,

                    'nameFirst': null,
                    'nameLast': null,
                    'email': null,
                    'timezone': null,
                    'pronouns': null
                }

                userInfo.nsdaMemberNumber = $($($('#content .main').children('div')[0]).children('span')[0]).text().trim().replace(/Member/g, '').replace(/#/g, '').trim()

                userInfo.nsdaPoints = $($($('#content .main').children('div')[0]).children('span')[1]).children('div')[1].children.find(child => child.type == 'text').data.trim().replace(/\D/g, '')

                userInfo.districtTournament = ($($($('#content .main').children('div')[0]).children('span')[1]).children('div')[2].children.find(child => child.type == 'text').data.trim().replace(/\t/g, "").replace(/\n/g, " ").toLowerCase().includes('you are eligible') ? userInfo.districtTournament = true : userInfo.districtTournament = false)

                userInfo.nsdaAffiliation = $($($($('#content .main').children('div')[1]).children('span')[0]).children('div')[0]).children('span')[3].children.find(child => child.type == 'text').data.trim()

                userInfo.latestNsdaHonor = $($($($('#content .main').children('div')[1]).children('span')[0]).children('div')[0]).children('span')[1].children.find(child => child.type == 'text').data.trim()

                userInfo.latestNsdaHonorDate = $($($($('#content .main').children('div')[1]).children('span')[0]).children('div')[0]).children('span')[2].children.find(child => child.type == 'text').data.trim()

                userInfo = await profile(req, userInfo)

                resApp.send(userInfo)
            })
    }

    async function profile(req, userInfo) {
        return new Promise((resolve, reject) => {
            superagent
                .get('https://www.tabroom.com/user/login/profile.mhtml')
                .set("Cookie", req.body.token)
                .end((err, res) => {
                    var $ = cheerio.load(res.text)
                    // history @ 0, tournament row @ 0
                    userInfo.nameFirst = $($($($($('#content .main').children('form')[0]).children('span')[0]).children('div')[0]).children('span')[1]).children('input[type=text][name=first]').val()

                    userInfo.nameLast = $($($($($('#content .main').children('form')[0]).children('span')[0]).children('div')[2]).children('span')[1]).children('input[type=text][name=last]').val()

                    userInfo.email = $($($($($('#content .main').children('form')[0]).children('span')[1]).children('div')[0]).children('span')[1]).children('input[type=text][name=email]').val()

                    // $($($($($('#content .main').children('form')[0]).children('span')[1]).children('div')[3]).children('span')[1]).children("select").val()
                    userInfo.timezone = $($($($($('#content .main').children('form')[0]).children('span')[1]).children('div')[3]).children('span')[1]).children("select").find('option:selected').text().trim()

                    userInfo.pronouns = $($($($($('#content .main').children('form')[0]).children('span')[1]).children('div')[4]).children('span')[1]).children('input[type=text][name=pronoun]').val().trim()

                    resolve(userInfo)
                })
        })
    }

})

app.get('/me/results', async function (req, resApp) {
    /**
     * @param {Object} -> Token: Tabroom Token as returned by the /login endpoint - Encode: X-WWW-FORM-URLENCODED - USE "token" FOR X-WWW-FORM-URLENCODED KEY & Short: a integer representing the number of months to go back when collecting records. Ex: short = 2 will only collect records from tournnaments that were held 2 months ago from today. Encode: X-WWW-FORM-URLENCODED - USE "short" FOR X-WWW-FORM-URLENCODED KEY
     *  {'token': 'Tabroom.com token', 'short': '2'}
     * @returns {Object} -> Token bearer's past competition history in JSON format
     * @description Might be for policy tab accounts only - non policy accounts may have different formatting in the results page (especially speech)
     *  Navigation of returned Object: https://stackoverflow.com/a/42097380/9108905
     */

    if (!apiKey.includes(req.body.apiauth)) {
        resApp.send('Invalid API Key or no authentication provided.')
        return;
    }

    let resData = "";

    basicInfo(req, resApp)
    async function basicInfo(req, resApp) {
        superagent
            .get('https://www.tabroom.com/user/home.mhtml')
            .set("Cookie", req.body.token)
            .end(async (err, res) => {

                /** Debugging
                 * console.log(res.text)
                 */

                var $ = cheerio.load(res.text);

                /** Debugging
                 * console.log($("div .nospace", ".main .results.screens").filter('h4'))
                 */

                for (i = 0; i < $("div .nospace", ".main .results.screens").filter('h4').length; i++) { // number of "History at"s -> 2

                    /** Debugging
                     * console.log($("div .nospace", ".main .results.screens").filter('h4')[i].children.find(child => child.type == 'text').data.trim())
                     */

                    resData += `"${$("div .nospace", ".main .results.screens").filter('h4')[i].children.find(child => child.type == 'text').data.trim()}": {`; // need closing }, after adding center core below. also need a {} to wrap the json

                    /** Debugging
                     * console.log(($("table", ".main .results.screens")[1].children.find(child => child.name == 'tbody').children.length-1)/2)
                     */

                    for (j = 0; j < (($("table", ".main .results.screens")[i].children.find(child => child.name == 'tbody').children.length - 1) / 2); j++) { // number of rows // might need a forloop searching for tr elements later on, but seems like its always 2x the actual number +1. 

                        /** Debugging
                         * console.log($("table", ".main .results.screens")[i].children[1].children.length)
                         * console.log(j)
                         * console.log($("table", ".main .results.screens")[0].children.find(child => child.name == 'tbody').children.find(child => child.name == 'tr').children.find(child => child.name == 'td'))
                         * console.log($("table", ".main .results.screens")[0].children.find(child => child.name == 'tbody').children.find(child => child.name == 'tr').children.find(child => child.name == 'td').children.find(child => child.name == 'a').children.find(child => child.type == 'text').data.trim()) 
                         * console.log($("table", ".main .results.screens")[0].children[1].children[j].next)
                         * console.log($("table", ".main .results.screens")[0].children[1].children[j].parent.parent.children.find(child => child.name == 'tbody').children.find(child => child.name == 'tr'))
                         * console.log($($("table", ".main .results.screens")[i].children.find(child => child.name == 'tbody')).children('tr')[j].children.find(child => child.name == 'td').children.find(child => child.name == 'a').children.find(child => child.type == 'text').data.trim())
                         */

                        resData += `"${$($("table", ".main .results.screens")[i].children.find(child => child.name == 'tbody')).children('tr')[j].children.find(child => child.name == 'td').children.find(child => child.name == 'a').children.find(child => child.type == 'text').data.trim()}": { "info": {`; // - set tournament section, which will hold the info & rounds sections


                        // info part

                        /** Debugging
                         * console.log($($($("table", ".main .results.screens")[i].children.find(child => child.name == 'tbody')).children('tr')[j]).children('td')[4].children.find(child => child.name == 'a').attribs.href)
                         */

                        let name = $($("table", ".main .results.screens")[i].children.find(child => child.name == 'tbody')).children('tr')[j].children.find(child => child.name == 'td').children.find(child => child.name == 'a').children.find(child => child.type == 'text').data.trim();

                        let tournamentID = $($("table", ".main .results.screens")[i].children.find(child => child.name == 'tbody')).children('tr')[j].children.find(child => child.name == 'td').children.find(child => child.name == 'a').attribs.href.substring($($("table", ".main .results.screens")[i].children.find(child => child.name == 'tbody')).children('tr')[j].children.find(child => child.name == 'td').children.find(child => child.name == 'a').attribs.href.indexOf('tourn_id=') + 9, $($("table", ".main .results.screens")[i].children.find(child => child.name == 'tbody')).children('tr')[j].children.find(child => child.name == 'td').children.find(child => child.name == 'a').attribs.href.indexOf('&student_id='))

                        let date = $($($("table", ".main .results.screens")[i].children.find(child => child.name == 'tbody')).children('tr')[j]).children('td')[1].children.find(child => child.name == 'span').children.find(child => child.type == 'text').data.trim();

                        // if timestamp date > 2*<month unix unix value> - tournament more than 2 mo ago. -> set j = limit condition

                        let dateUnix = Date.parse($($($("table", ".main .results.screens")[i].children.find(child => child.name == 'tbody')).children('tr')[j]).children('td')[1].children.find(child => child.name == 'span').children.find(child => child.type == 'text').data.trim())

                        var twoMonthBeforeDateObj = new Date()

                        twoMonthBeforeDateObj.setMonth(twoMonthBeforeDateObj.getMonth() - parseInt(req.body.short)) // set it (-n) months before

                        twoMonthBeforeDateObj.setHours(0, 0, 0)

                        twoMonthBeforeDateObj.setMilliseconds(0)

                        /** Debugging
                         * console.log(twoMonthBeforeDateObj.getTime()) // timestamp n months before today
                         */

                        let code = $($($("table", ".main .results.screens")[i].children.find(child => child.name == 'tbody')).children('tr')[j]).children('td')[2].children.find(child => child.type == 'text').data.trim();

                        let division = $($($("table", ".main .results.screens")[i].children.find(child => child.name == 'tbody')).children('tr')[j]).children('td')[3].children.find(child => child.type == 'text').data.trim();

                        let resultsLink = "https://www.tabroom.com/user/student/" + $($($("table", ".main .results.screens")[i].children.find(child => child.name == 'tbody')).children('tr')[j]).children('td')[4].children.find(child => child.name == 'a').attribs.href;


                        resData += `"name": "${name}", "tournID": "${tournamentID}", "date": "${date}", "code": "${code}", "division": "${division}", "resultsLink": "${resultsLink}"}, "rounds":{`; // extra } to close info section

                        /** Debugging
                         * console.log("UNIX" + dateUnix)
                         */

                        if ((dateUnix < twoMonthBeforeDateObj.getTime()) && (req.body.short != undefined)) {
                            j = (($("table", ".main .results.screens")[i].children.find(child => child.name == 'tbody').children.length - 1) / 2) - 1;
                        }

                        // call func to complete the rounds part
                        resData = await individualRecords(resData, resultsLink, req, $, j, i)

                        /** Debugging
                         * console.log(resData)
                         *  break;
                         */

                    }
                    if (i + 1 === $("div .nospace", ".main .results.screens").filter('h4').length) { // final history at section, no need for ,
                        resData += `}`; // close "history at... sectioin"
                    } else { // more history at sections below, need comma to seperate
                        resData += `},`; // close "history at... sectioin"
                    }
                }
                resData = `{${resData}}`;
                /** Debugging
                 * console.log(resData);
                 * console.log(JSON.parse(resData))
                 */
                resApp.send(JSON.parse(resData));
            });
    }

    async function individualRecords(resData, resultsLink, req, $, j, i) {
        // each individual records
        return new Promise((resolve, reject) => {

            resData = resData
            superagent
                .get(resultsLink)
                .set("Cookie", req.body.token)
                .end((err, recordsRes) => {
                    var individualCheerio = cheerio.load(recordsRes.text);
                    /** Debugging
                     * console.log("I AM IN HERRE");
                     * console.log(individualCheerio('.main'))
                     * console.log(individualCheerio('.main').text().length)
                     */
                    if (individualCheerio('.main').text().length < 55) {

                        if (j + 1 === (($("table", ".main .results.screens")[i].children.find(child => child.name == 'tbody').children.length - 1) / 2)) {
                            resData += `"rounds blank": {"round":"","start":"","room":"","side":"","oppoent":"","judge":"","paradigm":"","result":"","speaks":"","rfd":""}}}`; // close this blank round, close rounds section, close tournament section
                        } else {
                            resData += `"rounds blank": {"round":"","start":"","room":"","side":"","oppoent":"","judge":"","paradigm":"","result":"","speaks":"","rfd":""}}},`; // close this blank round, close rounds section, close tournament section, but there is another tournament
                        }

                    } else {
                        for (x = 0; x < individualCheerio('table', '.main .nospace.martopmore').children('tbody').children('tr').length; x++) { // loop through the number of rounds in that tournament
                            let round = individualCheerio(individualCheerio('table', '.main .nospace.martopmore').children('tbody').children('tr')[x]).children('td')[0].children.find(child => child.type == 'text').data.trim();

                            let startTime = individualCheerio(individualCheerio(individualCheerio('table', '.main .nospace.martopmore').children('tbody').children('tr')[x]).children('td')[1]).children('span').children().text().replace("	", "").replace(/\n/g, "").trim();

                            let room = individualCheerio(individualCheerio('table', '.main .nospace.martopmore').children('tbody').children('tr')[x]).children('td')[2].children.find(child => child.type == 'text').data.trim();

                            let side = individualCheerio(individualCheerio('table', '.main .nospace.martopmore').children('tbody').children('tr')[x]).children('td')[3].children.find(child => child.type == 'text').data.trim();

                            let oppoentCode = individualCheerio(individualCheerio('table', '.main .nospace.martopmore').children('tbody').children('tr')[x]).children('td')[4].children.find(child => child.type == 'text').data.trim();

                            let judgeName = individualCheerio(individualCheerio(individualCheerio(individualCheerio('table', '.main .nospace.martopmore').children('tbody').children('tr')[x]).children('td')[5]).children('div').children('span')[0]).text().trim().substring(1);

                            let judgeParadigmLink = ""
                            try {
                                judgeParadigmLink = "https://www.tabroom.com" + individualCheerio(individualCheerio(individualCheerio('table', '.main .nospace.martopmore').children('tbody').children('tr')[x]).children('td')[5]).children('div').children('span')[0].children.find(child => child.name == 'span').children.find(child => child.name == 'a').attribs.href;
                            } catch (err) {
                                judgeParadigmLink = "no paradigm"
                            }

                            let result = individualCheerio(individualCheerio(individualCheerio(individualCheerio(individualCheerio('table', '.main .nospace.martopmore').children('tbody').children('tr')[x]).children('td')[5]).children('div').children('span')[1]).children('span')[0]).text().trim();
                            if (result.length > 5) result = "no result" // if its longer than 5 chars then its prob bad data

                            let speaks = individualCheerio(individualCheerio(individualCheerio(individualCheerio(individualCheerio('table', '.main .nospace.martopmore').children('tbody').children('tr')[x]).children('td')[5]).children('div').children('span')[1]).children('span')[1]).text().trim();

                            let rfdLink = "";
                            try {
                                rfdLink = "https://www.tabroom.com" + individualCheerio(individualCheerio(individualCheerio('table', '.main .nospace.martopmore').children('tbody').children('tr')[x]).children('td')[5]).children('div').children('span')[2].children.find(child => child.name == 'a').attribs.href;
                            } catch (err) {
                                rfdLink = 'No rfd';
                            }

                            /** Debugging
                             * break;
                             */

                            if (x + 1 == individualCheerio('table', '.main .nospace.martopmore').children('tbody').children('tr').length) { // last round, no comma needed
                                if (j + 1 === (($("table", ".main .results.screens")[i].children.find(child => child.name == 'tbody').children.length - 1) / 2)) {
                                    resData += `"${round.toLowerCase()}": {"round":"${round}","start":"${startTime.replace(/\n/g, "").replace(/\t/g, "")}","room":"${room}","side":"${side}","oppoent":"${oppoentCode}","judge":"${judgeName.replace(/\n/g, "").replace(/\t/g, "")}","paradigm":"${judgeParadigmLink}","result":"${result}","speaks":"${speaks.replace(/\n/g, "").replace(/\t/g, "")}","rfd":"${rfdLink}"}}}`; // close last round section, close rounds section, close tournament section
                                } else {
                                    resData += `"${round.toLowerCase()}": {"round":"${round}","start":"${startTime.replace(/\n/g, "").replace(/\t/g, "")}","room":"${room}","side":"${side}","oppoent":"${oppoentCode}","judge":"${judgeName.replace(/\n/g, "").replace(/\t/g, "")}","paradigm":"${judgeParadigmLink}","result":"${result}","speaks":"${speaks.replace(/\n/g, "").replace(/\t/g, "")}","rfd":"${rfdLink}"}}},`; // close last round section, close rounds section, close tournament section, but there is another tournament
                                }
                            } else {
                                resData += `"${round.toLowerCase()}": {"round":"${round}","start":"${startTime.replace(/\n/g, "").replace(/\t/g, "")}","room":"${room}","side":"${side}","oppoent":"${oppoentCode}","judge":"${judgeName.replace(/\n/g, "").replace(/\t/g, "")}","paradigm":"${judgeParadigmLink}","result":"${result}","speaks":"${speaks.replace(/\n/g, "").replace(/\t/g, "")}","rfd":"${rfdLink}"},`;
                            }
                        }
                    }
                    resolve(resData)
                    /** Debugging
                     * console.log(resData)
                     */
                })
        })
    }

})



app.get('/me/future', (req, resApp) => {
    /**
     * @param {Object} -> Token: User's Tabroom.com token - Encode: X-WWW-FORM-URLENCODED - USE "token" FOR X-WWW-FORM-URLENCODED KEY
     *  {'token': 'Tabroom.com Token'}
     * @returns {Array} -> [...<n> future tournaments...] - Order: Most recent one first, as appears on tabroom.com
     */

    if (!apiKey.includes(req.body.apiauth)) {
        resApp.send('Invalid API Key or no authentication provided.')
        return;
    }

    superagent
        .get('https://www.tabroom.com/user/student/index.mhtml')
        .set("Cookie", req.body.token)
        .redirects(0)
        .end((err, res) => {
            var $ = cheerio.load(res.text)

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

            resApp.send(futureTournament)
        })

})



app.get('/paradigm', (req, resApp) => {
    /**
     * @param {object} -> EITHER:
     *  {type: "name", first: "john", last: "appleseed"}
     *  {type: "id", id: "1234"}
     *  {type: "link", link: "https://www.tabroom.com/index/paradigm.mhtml?judge_person_id=6606"}
     * @returns {Array}: ["Raw Paradigm Text", "Paradigm Text w/ HTML Markup", ...judging records...]
     */

    if (!apiKey.includes(req.body.apiauth)) {
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

    if (req.body.first != undefined) {
        superagent
            .post('https://www.tabroom.com/index/paradigm.mhtml')
            .set('Content-Type', 'application/x-www-form-urlencoded')
            .redirects(0)
            .send(JSON.parse(`{"search_first": "${req.body.first}", "search_last": "${req.body.last}"}`))
            .end((err, res) => {
                var $ = cheerio.load(res.text)
                /**
                 * loop: i->table len. Count votes while stuffing tournament info in json objs stuffed in an array
                 */
                var roundJudgedInfo = null
                var judgeRecord = []
                judgeRecord.push($('.paradigm').text())
                judgeRecord.push($('.paradigm').html().replace(/<p>/gmi, "").replace(/<\/p>/gmi, ""))

                for (i = 0; i < $('#record').children('tbody').children('tr').length; i++) {
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

                    roundJudgedInfo.tournament = $($('#record').children('tbody').children('tr')[i]).children('td')[0].children.find(child => child.name == 'a').children.find(child => child.type == 'text').data.trim()

                    roundJudgedInfo.date = $($('#record').children('tbody').children('tr')[i]).children('td')[1].children.find(child => child.name == 'span').next.data.trim()

                    roundJudgedInfo.timestamp = $($('#record').children('tbody').children('tr')[i]).children('td')[1].children.find(child => child.name == 'span').children.find(child => child.type == 'text').data.trim()

                    roundJudgedInfo.event = $($('#record').children('tbody').children('tr')[i]).children('td')[2].children.find(child => child.type == 'text').data.trim()

                    roundJudgedInfo.round = $($('#record').children('tbody').children('tr')[i]).children('td')[3].children.find(child => child.name == 'a').children.find(child => child.type == 'text').data.trim()

                    roundJudgedInfo.affTeamCode = $($('#record').children('tbody').children('tr')[i]).children('td')[4].children.find(child => child.name == 'a').children.find(child => child.type == 'text').data.trim()

                    roundJudgedInfo.negTeamCode = $($('#record').children('tbody').children('tr')[i]).children('td')[5].children.find(child => child.name == 'a').children.find(child => child.type == 'text').data.trim()

                    roundJudgedInfo.judgeVote = $($('#record').children('tbody').children('tr')[i]).children('td')[6].children.find(child => child.type == 'text').data.trim()

                    roundJudgedInfo.result = $($('#record').children('tbody').children('tr')[i]).children('td')[7].children.find(child => child.type == 'text').data.trim()

                    /** Debugging
                     * break;
                     */

                    judgeRecord.push(roundJudgedInfo)

                }
                resApp.send(judgeRecord)
            })
    }
    else {
        superagent
            .get(requestLink)
            .redirects(0)
            .end((err, res) => {
                var $ = cheerio.load(res.text)
                /**
                 * loop: i->table len. Count votes while stuffing tournament info in json objs stuffed in an array
                 */
                var roundJudgedInfo = null
                var judgeRecord = []
                judgeRecord.push($('.paradigm').text())
                judgeRecord.push($('.paradigm').html().replace(/<p>/gmi, "").replace(/<\/p>/gmi, ""))
                for (i = 0; i < $('#record').children('tbody').children('tr').length; i++) {
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

                    roundJudgedInfo.tournament = $($('#record').children('tbody').children('tr')[i]).children('td')[0].children.find(child => child.name == 'a').children.find(child => child.type == 'text').data.trim()

                    roundJudgedInfo.date = $($('#record').children('tbody').children('tr')[i]).children('td')[1].children.find(child => child.name == 'span').next.data.trim()

                    roundJudgedInfo.timestamp = $($('#record').children('tbody').children('tr')[i]).children('td')[1].children.find(child => child.name == 'span').children.find(child => child.type == 'text').data.trim()

                    roundJudgedInfo.event = $($('#record').children('tbody').children('tr')[i]).children('td')[2].children.find(child => child.type == 'text').data.trim()

                    roundJudgedInfo.round = $($('#record').children('tbody').children('tr')[i]).children('td')[3].children.find(child => child.name == 'a').children.find(child => child.type == 'text').data.trim()

                    roundJudgedInfo.affTeamCode = $($('#record').children('tbody').children('tr')[i]).children('td')[4].children.find(child => child.name == 'a').children.find(child => child.type == 'text').data.trim()

                    roundJudgedInfo.negTeamCode = $($('#record').children('tbody').children('tr')[i]).children('td')[5].children.find(child => child.name == 'a').children.find(child => child.type == 'text').data.trim()

                    roundJudgedInfo.judgeVote = $($('#record').children('tbody').children('tr')[i]).children('td')[6].children.find(child => child.type == 'text').data.trim()

                    roundJudgedInfo.result = $($('#record').children('tbody').children('tr')[i]).children('td')[7].children.find(child => child.type == 'text').data.trim()

                    /** Debugging
                     * break;
                     */

                    judgeRecord.push(roundJudgedInfo)
                }
                resApp.send(judgeRecord)
            })
    }
})

app.get('/upcoming', (req, resApp) => {

    if (!apiKey.includes(req.body.apiauth)) {
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




port = process.env.PORT;
if (port == null || port == "") {
    port = 8080;
}
app.listen(port)
console.log(`Listening at http://localhost:${port}`)
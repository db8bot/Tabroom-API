const superagent = require('superagent')
const cheerio = require('cheerio')
const child_process = require('child_process')

function basicInfo(req) {
    return new Promise((resolve, reject) => {

        superagent
            .get('https://www.tabroom.com/user/home.mhtml')
            .set("Cookie", req.body.token)
            .end((err, res) => {
                var $ = cheerio.load(res.text);

                var executeTime = 0
                var roundsArr = []
                var resultsLinks = []
                var tournamentArr = []
                var tournamentArraySorted = []
                var masterObj = {}
                for (i = 0; i < $("div .nospace", ".main .results.screens").filter('h4').length; i++) { // number of histories
                    for (j = 0; j < (($("table", ".main .results.screens")[i].children.find(child => child.name == 'tbody').children.length - 1) / 2); j++) { // number of tourns in history
                        // add date choke point here later.
                        resultsLinks.push("https://www.tabroom.com/user/student/" + $($($("table", ".main .results.screens")[i].children.find(child => child.name == 'tbody')).children('tr')[j]).children('td')[4].children.find(child => child.name == 'a').attribs.href)
                    }
                    const getRoundInfo = child_process.fork('modules/subprocesses/getRoundInfo.js')
                    getRoundInfo.send([JSON.stringify(resultsLinks), req.body.token])
                    resultsLinks = []

                    for (j = 0; j < (($("table", ".main .results.screens")[i].children.find(child => child.name == 'tbody').children.length - 1) / 2); j++) {
                        let name = $($("table", ".main .results.screens")[i].children.find(child => child.name == 'tbody')).children('tr')[j].children.find(child => child.name == 'td').children.find(child => child.name == 'a').children.find(child => child.type == 'text').data.trim();

                        let tournamentID = $($("table", ".main .results.screens")[i].children.find(child => child.name == 'tbody')).children('tr')[j].children.find(child => child.name == 'td').children.find(child => child.name == 'a').attribs.href.substring($($("table", ".main .results.screens")[i].children.find(child => child.name == 'tbody')).children('tr')[j].children.find(child => child.name == 'td').children.find(child => child.name == 'a').attribs.href.indexOf('tourn_id=') + 9, $($("table", ".main .results.screens")[i].children.find(child => child.name == 'tbody')).children('tr')[j].children.find(child => child.name == 'td').children.find(child => child.name == 'a').attribs.href.indexOf('&student_id='))

                        let date = $($($("table", ".main .results.screens")[i].children.find(child => child.name == 'tbody')).children('tr')[j]).children('td')[1].children.find(child => child.name == 'span').children.find(child => child.type == 'text').data.trim();

                        let dateUnix = Date.parse($($($("table", ".main .results.screens")[i].children.find(child => child.name == 'tbody')).children('tr')[j]).children('td')[1].children.find(child => child.name == 'span').children.find(child => child.type == 'text').data.trim())

                        var twoMonthBeforeDateObj = new Date()

                        twoMonthBeforeDateObj.setMonth(twoMonthBeforeDateObj.getMonth() - parseInt(req.body.short)) // set it (-n) months before

                        twoMonthBeforeDateObj.setHours(0, 0, 0)

                        twoMonthBeforeDateObj.setMilliseconds(0)

                        let code = $($($("table", ".main .results.screens")[i].children.find(child => child.name == 'tbody')).children('tr')[j]).children('td')[2].children.find(child => child.type == 'text').data.trim();

                        let division = $($($("table", ".main .results.screens")[i].children.find(child => child.name == 'tbody')).children('tr')[j]).children('td')[3].children.find(child => child.type == 'text').data.trim();

                        let resultsLink = "https://www.tabroom.com/user/student/" + $($($("table", ".main .results.screens")[i].children.find(child => child.name == 'tbody')).children('tr')[j]).children('td')[4].children.find(child => child.name == 'a').attribs.href;

                        tournamentArr.push({
                            name: name.replace(/\n/g, "").replace(/\t/g, ""),
                            tournID: tournamentID.replace(/\n/g, "").replace(/\t/g, ""),
                            date: date.replace(/\n/g, "").replace(/\t/g, ""),
                            code: code.replace(/\n/g, "").replace(/\t/g, ""),
                            division: division.replace(/\n/g, "").replace(/\t/g, ""),
                            resultsLink: resultsLink
                        })

                    }
                    tournamentArraySorted.push(tournamentArr)
                    tournamentArr = []

                    getRoundInfo.on('message', (msg) => {
                        // full tournametn array
                        // half get round info arr

                        executeTime++
                        roundsArr.push(JSON.parse(msg))
                        if (executeTime === $("div .nospace", ".main .results.screens").filter('h4').length) {
                            // console.log('2nd execute')
                            // console.log(JSON.stringify(tournamentArraySorted))
                            // console.log(JSON.stringify(roundsArr))

                            var historyAtNames = []
                            for (i = 0; i < $("div .nospace", ".main .results.screens").filter('h4').length; i++) {
                                historyAtNames.push($("div .nospace", ".main .results.screens").filter('h4')[i].children.find(child => child.type == 'text').data.trim())
                            }
                            var infoObj = []
                            var tempInfoObj = []
                            for (i = 0; i < tournamentArraySorted.length; i++) {
                                for (j = 0; j < tournamentArraySorted[i].length; j++) {
                                    tempInfoObj.push(tournamentArraySorted[i][j])
                                }
                                infoObj.push(tempInfoObj)
                                tempInfoObj = []
                            }

                            var roundsObj = {}
                            var tournamentObj = {}
                            for (k = 0; k < roundsArr.length; k++) { // 2 histories
                                for (j = 0; j < roundsArr[k].length; j++) { // 2 tournaments
                                    for (h = 0; h < roundsArr[k][j].length; h++) { // arr of round objs
                                        roundsObj[roundsArr[k][j][h].round.toLowerCase()] = roundsArr[k][j][h]
                                    }
                                    tournamentObj[infoObj[k][j].name] = {
                                        'rounds': roundsObj,
                                        'info': infoObj[k][j]
                                    }
                                    roundsObj = {}
                                }
                                masterObj[historyAtNames[k]] = tournamentObj
                                tournamentObj = {}
                            }
                            infoObj = {}
                            resolve(masterObj)

                        }

                    })


                }
            })
    })
}

module.exports = {
    basicInfo: basicInfo
}
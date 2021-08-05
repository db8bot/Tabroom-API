const superagent = require('superagent')
const cheerio = require('cheerio')
const fs = require('fs')
const child_process = require('child_process')

function basicTournamentInfo(token) {
    return new Promise((resolve, reject) => {
        const currentTimeArray = child_process.fork('modules/subprocesses/currentTimeArray.js')
        currentTimeArray.send(token)
        superagent
            .get('https://www.tabroom.com/user/student/index.mhtml?default=current')
            .set("Cookie", token)
            .redirects(0)
            .end((err, res) => {
                if (process.env.PORT == null || process.env.PORT == "") {
                    var $ = cheerio.load(fs.readFileSync(`./dev/Tabroom.com ASU rd5 included.html`))
                } else {
                    var $ = cheerio.load(res.text)                
                }

                if ($('.screens.current').children().length === 1) { // no current entries
                    resolve(204) // resolve 204
                } else if ($('.screens.current').children().length > 1) {
                    var currentEntries = []
                    var basicInfo = {
                        "tournamentName": null,
                        "event": null,
                        "code": null
                    }

                    basicInfo.tournamentName = $($($('.screens.current').children('div')[0]).children('span')[0]).text().trim()
                    basicInfo.event = $($($('.screens.current').children('div')[0]).children('span')[1]).text().trim()
                    basicInfo.code = $($($('.screens.current').children('div')[0]).children('span')[2]).text().trim().replace('Code: ', "")

                    currentEntries.push(basicInfo)

                    currentTimeArray.on('message', (msg) => {
                        var tournamentStart = new Date(msg)
                        for (i = $($($('.full.nospace.martopmore', '.screens.current')[0]).children('table')[0]).children('tbody').children().length - 1; i >= 0; i--) { // i = 3 -> i=1 its a backwards loop
                            var roundInfo = {
                                "roundNum": null,
                                "startTime": null,
                                "startTimeUnix": null,
                                "room": null, // post x-www-url-encoded with key
                                "nsdaCampusJWT": null,
                                "side": null,
                                "oppoent": null,
                                "judge": null,
                                "paradigmLink": null,
                                "results": null
                            }

                            roundInfo.roundNum = $($($($('.full.nospace.martopmore', '.screens.current').children('table')[0]).children('tbody').children('tr')[i]).children('td')[0]).text().trim()

                            roundInfo.startTime = $($($($('.full.nospace.martopmore', '.screens.current').children('table')[0]).children('tbody').children('tr')[i]).children('td')[1]).text().trim().replace(/\t/g, "").replace(/\n/g, " ")

                            var roundDayNumber = {
                                "Mon": 1,
                                "Tue": 2,
                                "Wed": 3,
                                "Thu": 4,
                                "Fri": 5,
                                "Sat": 6,
                                "Sun": 7
                            }
                            // console.log(roundInfo.startTime)
                            // console.log(roundDayNumber[roundInfo.startTime.split(' ')[0]])
                            // console.log(tournamentStart.getDay())

                            var roundStartDate = new Date(tournamentStart.toDateString())
                            roundStartDate.setDate(tournamentStart.getDate() + (Math.abs(roundDayNumber[roundInfo.startTime.split(' ')[0]] - tournamentStart.getDay())))

                            var splitTimeArr = $($($($('.full.nospace.martopmore', '.screens.current').children('table')[0]).children('tbody').children('tr')[i]).children('td')[1]).text().trim().replace(/\t/g, "").split('\n')
                            roundInfo.startTimeUnix = Date.parse(roundStartDate.toDateString() + " " + (splitTimeArr[0] + " " + splitTimeArr[1]).split(' ').slice(1).join(' ').replace('undefined', "").trim())

                            if ($($($($('.full.nospace.martopmore', '.screens.current').children('table')[0]).children('tbody').children('tr')[i]).children('td')[2]).html().includes('campus.speechanddebate.org')) {
                                roundInfo.room = 'Jitsi Meet/NSDA Campus'
                                roundInfo.nsdaCampusJWT = $($($($('.full.nospace.martopmore', '.screens.current').children('table')[0]).children('tbody').children('tr')[0]).children('td')[2]).children('form').children('input').val()
                            } else {
                                roundInfo.room = $($($($('.full.nospace.martopmore', '.screens.current').children('table')[0]).children('tbody').children('tr')[i]).children('td')[2]).text().trim().replace(/\t/g, "").replace(/\n/g, "")
                            }

                            roundInfo.side = $($($($('.full.nospace.martopmore', '.screens.current').children('table')[0]).children('tbody').children('tr')[i]).children('td')[3]).text().trim().replace(/\t/g, "").replace(/\n/g, "")
                            roundInfo.oppoent = $($($($('.full.nospace.martopmore', '.screens.current').children('table')[0]).children('tbody').children('tr')[i]).children('td')[4]).text().trim().replace(/\t/g, "").replace(/\n/g, "")
                            roundInfo.judge = $($($($('.full.nospace.martopmore', '.screens.current').children('table')[0]).children('tbody').children('tr')[i]).children('td')[5]).children('div').children('span')[0].attribs.title
                            roundInfo.paradigmLink = "https://www.tabroom.com" + $($($($('.full.nospace.martopmore', '.screens.current').children('table')[0]).children('tbody').children('tr')[i]).children('td')[5]).children('div').children('span').children('span').children('a')[0].attribs.href
                            // ^ downloaded html files have the their links amended with the domain - so this is broken on downloaded html files

                            currentEntries.push(roundInfo)


                        }
                        resolve(currentEntries)
                    })
                }

            })
    })
}



module.exports = {
    basicTournamentInfo: basicTournamentInfo
}
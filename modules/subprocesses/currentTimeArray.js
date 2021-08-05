const superagent = require('superagent')
const cheerio = require('cheerio')
const fs = require('fs')
process.on('message', (token) => {
    superagent
        .get(`https://www.tabroom.com/user/student/index.mhtml?default=future`)
        .set("Cookie", token)
        .redirects(0)
        .end((err, resFuture) => {
            if (process.env.PORT == null || process.env.PORT == "") { // dev
                var futureTourn = cheerio.load(fs.readFileSync('./dev/Tabroom.com ASU rd5 included.html'))
            } else {
                var futureTourn = cheerio.load(resFuture.text)
            }

            var timeArray = []
            var tournamentStart = null;
            for (i = 0; i < futureTourn('#upcoming').children('tbody').children('tr').length; i++) {
                timeArray.push(Date.parse(futureTourn(futureTourn(futureTourn('#upcoming').children('tbody').children('tr')[i]).children('td')[1]).text().trim()))
            }
            timeArray.sort((a, b) => a - b)
            for (i = 0; i < timeArray.length; i++) {
                if (Date.parse(futureTourn(futureTourn(futureTourn('#upcoming').children('tbody').children('tr')[i]).children('td')[1]).text().trim()) === timeArray[0]) {
                    // eventLink = "https://www.tabroom.com" + futureTourn(futureTourn(futureTourn('#upcoming').children('tbody').children('tr')[i]).children('td')[2]).children('a')[0].attribs.href - not used
                    tournamentStart = futureTourn(futureTourn(futureTourn('#upcoming').children('tbody').children('tr')[i]).children('td')[1]).text().trim()
                    break;
                }
            }



            process.send(tournamentStart)
            console.log(`process exited with code 0`)
            process.exit(0)

        })
})
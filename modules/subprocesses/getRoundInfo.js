const superagent = require('superagent')
const cheerio = require('cheerio')

process.on('message', (msg) => {
    var resultsLink = JSON.parse(msg[0])
    var token = msg[1]
    var returnArr = [] // this array will be full of returnArrRounds arrays. each element in this array represents a tournament

    for (const link of resultsLink) {
        returnArr.push(req(link, token))
    }

    Promise.all(returnArr).then(val => {
        process.send(JSON.stringify(val))
        process.exit(0)
    }).catch((err) => {
        console.error(err)
        process.exit(1)

    })
})

function req(link, token) {
    return new Promise((resolve, reject) => {
        var returnArrRounds = [] // this array will be full of rounds.
        superagent
            .get(link)
            .set("Cookie", token)
            .end((err, recordsRes) => {
                if (err) reject(err)
                var individualCheerio = cheerio.load(recordsRes.text);

                for (x = 0; x < individualCheerio('table', '.main .nospace.martopmore').children('tbody').children('tr').length; x++) { // for each round in resuls link
                    let round = individualCheerio(individualCheerio('table', '.main .nospace.martopmore').children('tbody').children('tr')[x]).children('td')[0].children.find(child => child.type == 'text').data.trim();

                    let startTime = individualCheerio(individualCheerio(individualCheerio('table', '.main .nospace.martopmore').children('tbody').children('tr')[x]).children('td')[1]).children('span').text().replace("	", "").replace(/\n/g, "").trim();

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

                    returnArrRounds.push({
                        round: round.replace(/\n/g, "").replace(/\t/g, ""),
                        start: startTime.replace(/\n/g, "").replace(/\t+/g, " "),
                        room: room.replace(/\n/g, "").replace(/\t/g, ""),
                        side: side.replace(/\n/g, "").replace(/\t/g, ""),
                        opponent: oppoentCode.replace(/\n/g, "").replace(/\t/g, ""),
                        judge: judgeName.replace(/\n/g, "").replace(/\t/g, ""),
                        paradigm: judgeParadigmLink.replace(/\n/g, "").replace(/\t/g, ""),
                        result: result.replace(/\n/g, "").replace(/\t/g, ""),
                        speaks: speaks.replace(/\n/g, "").replace(/\t/g, ""),
                        rfd: rfdLink
                    })
                }
                resolve(returnArrRounds)
            })
    })

}
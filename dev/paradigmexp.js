const superagent = require('superagent')
const cheerio = require('cheerio')

const requestLink = 'https://www.tabroom.com/index/paradigm.mhtml?judge_person_id=185947'


superagent
    .get(requestLink)
    .set('User-Agent', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36')
    .end((err, res) => {
        if (err) return resApp.status(500).send(err)
        const $ = cheerio.load(res.text)

        let paradigmText = $('.paradigm.ltborderbottom').text().trim()

        console.log(paradigmText)
    })
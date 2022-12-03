const superagent = require('superagent')
const cheerio = require('cheerio')
const { Tabletojson: tabletojson } = require('tabletojson')

// const requestLink = 'https://www.tabroom.com/index/paradigm.mhtml?judge_person_id=185947'
const requestLink = 'https://www.tabroom.com/index/paradigm.mhtml?judge_person_id=6631'


superagent
    .get(requestLink)
    .set('User-Agent', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36')
    .end((err, res) => {
        if (err) return resApp.status(500).send(err)

        
    })
        // const $ = cheerio.load(res.text)

        // let paradigmText = $('.paradigm.ltborderbottom').text().trim()
        // const converted = tabletojson.convert(res.text)

        // console.log(paradigmText)
        // console.log(converted)
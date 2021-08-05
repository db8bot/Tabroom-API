const superagent = require('superagent')
const cheerio = require('cheerio')

function nsda(req) {
    return new Promise((resolve, reject) => {
        superagent
            .get('https://www.tabroom.com/user/student/nsda.mhtml')
            .set("Cookie", req.body.token)
            .end((err, res) => {
                if (err) reject(err)
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
                    'pronouns': null
                }

                userInfo.nsdaMemberNumber = $($($('#content .main').children('div')[0]).children('span')[0]).text().trim().replace(/Member/g, '').replace(/#/g, '').trim()

                if (userInfo.nsdaMemberNumber.includes('Upcoming Tournaments')) {
                    // token out of date
                    resApp.status(403)
                    resApp.send(`Tabroom.com token is out of date, please run /login again to get token.`)
                    return;
                }

                userInfo.nsdaPoints = $($($('#content .main').children('div')[0]).children('span')[1]).children('div')[1].children.find(child => child.type == 'text').data.trim().replace(/\D/g, '')

                userInfo.districtTournament = ($($($('#content .main').children('div')[0]).children('span')[1]).children('div')[2].children.find(child => child.type == 'text').data.trim().replace(/\t/g, "").replace(/\n/g, " ").toLowerCase().includes('you are eligible') ? userInfo.districtTournament = true : userInfo.districtTournament = false)

                userInfo.nsdaAffiliation = $($($($('#content .main').children('div')[1]).children('span')[0]).children('div')[0]).children('span')[3].children.find(child => child.type == 'text').data.trim()

                userInfo.latestNsdaHonor = $($($($('#content .main').children('div')[1]).children('span')[0]).children('div')[0]).children('span')[1].children.find(child => child.type == 'text').data.trim()

                userInfo.latestNsdaHonorDate = $($($($('#content .main').children('div')[1]).children('span')[0]).children('div')[0]).children('span')[2].children.find(child => child.type == 'text').data.trim()

                resolve(userInfo)
            })
    })
}

function profile(req) {
    return new Promise((resolve, reject) => {
        var userInfo = {}
        superagent
            .get('https://www.tabroom.com/user/login/profile.mhtml')
            .set("Cookie", req.body.token)
            .end((err, res) => {
                if (err) reject(err)
                var $ = cheerio.load(res.text)

                // history @ 0, tournament row @ 0
                userInfo.nameFirst = $($('[name="first"]')[0]).attr('value')

                userInfo.nameLast = $($('[name="last"]')[0]).attr('value')

                userInfo.email = $($('[name="email"]')[0]).attr('value')

                userInfo.pronouns = $($('[name="pronoun"]')[0]).attr('value')

                resolve(userInfo)
            })
    })
}

module.exports = {
    nsda: nsda,
    profile: profile
}
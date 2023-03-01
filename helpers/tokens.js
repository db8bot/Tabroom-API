// token exp test
const superagent = require('superagent')

function tabroomTokenTest(req, resApp) {
    return new Promise((resolve, reject) => {
        superagent
            .get('https://www.tabroom.com/user/student/index.mhtml')
            .set('Cookie', req.body.token)
            .redirects(0)
            .end((err, res) => {
                if (err && err.status !== 302) {
                    resApp.status(500).send(`Error ${err}`)
                    resolve(false)
                }
                if (res.text.includes('Your login session has expired.  Please log in again.')) { // token expired
                    resApp.status(403)
                    resApp.send('Tabroom.com token is out of date, please run /login again to get token.')
                    resolve(false)
                } else {
                    resolve(true)
                }
            })
    })
}

module.exports = {
    tabroomTokenTest
}
const express = require('express')
const superagent = require('superagent')
const router = express.Router()

/**
    * @param {Object} -> Username: Tabroom email & Password: Tabroom password EX: { username: 'yfang@ex.org', password: 'password' } - Encode: X-WWW-FORM-URLENCODED
    * @returns {Object} -> Token: Tabroom Token (Format: Cookie) & Expiration: Tabroom Token Expiration Date (GMT)
    * Note this is unsecure as it requires a user's raw credentials to be passed to a server. authentication should be done on the client side using the same method here.
    */

router.post('/', async (req, resApp) => {

    var authKeys = req.app.get('authKeys')
    if (!require('../helpers/auth').verifyAuth(authKeys, req, resApp)) return

    var useragent = req.app.get('useragent')

    let resData = null
    superagent
        .post('https://www.tabroom.com/user/login/login_save.mhtml')
        .set('Content-Type', 'application/x-www-form-urlencoded')
        .set('User-Agent', useragent)
        .redirects(0)
        .send(req.body)
        .end((err, res) => {
            /** Debugging
             * console.log(err)
             * console.log(res.headers)
             * console.log(res.headers["set-cookie"][res.headers["set-cookie"].length - 1])
             */
            if (err && err.status !== 302) {
                resApp.status(500).send(`Error ${err}`)
            }
            resData = {
                token: res.headers['set-cookie'][res.headers['set-cookie'].length - 1],
                expiration: res.headers['set-cookie'][res.headers['set-cookie'].length - 1].substring(res.headers['set-cookie'][res.headers['set-cookie'].length - 1].indexOf('expires=') + 'expires='.length, res.headers['set-cookie'][res.headers['set-cookie'].length - 1].indexOf('; secure'))
            }
            resApp.send(resData)
        })
})

module.exports = router
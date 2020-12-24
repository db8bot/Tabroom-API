const express = require('express')
const { response } = require('express');
const cheerio = require('cheerio');
const superagent = require('superagent');
var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser')
var app = express()
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))
app.use(cookieParser())


app.post('/login', (req, resApp) => {
    /**
    * @param {Object} -> Username: Tabroom email & Password: Tabroom password EX: { username: 'yfang@ex.org', password: 'password' } - Encode: X-WWW-FORM-URLENCODED
    * @return {Object} -> Token: Tabroom Token & Expiration: Tabroom Token Expiration Date (GMT)
    */

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
                "token": res.headers["set-cookie"][res.headers["set-cookie"].length - 1].substring("TabroomToken=".length, res.headers["set-cookie"][res.headers["set-cookie"].length - 1].indexOf(';')),
                "expiration": res.headers["set-cookie"][res.headers["set-cookie"].length - 1].substring(res.headers["set-cookie"][res.headers["set-cookie"].length - 1].indexOf('expires=') + "expires=".length, res.headers["set-cookie"][res.headers["set-cookie"].length - 1].indexOf("; secure"))
            }
            resApp.send(resData)
        })
})


app.get('/results', (req, resApp) => {
    console.log(req.body)
    console.log(req.body.token)
    let resData = null;

    superagent
        .get('https://www.tabroom.com/user/home.mhtml')
        .set("Cookie", req.body.token) // issue here
        .end((err, res) => {
            console.log(res.text)
            var $ = cheerio.load(res.text)
            console.log($("table",".results.screens").length)
        })
})




port = process.env.PORT;
if (port == null || port == "") {
    port = 8080;
}
app.listen(port)
console.log(`Listening at http://localhost:${port}`)
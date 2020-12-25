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
    * @return {Object} -> Token: Tabroom Token (Format: Cookie) & Expiration: Tabroom Token Expiration Date (GMT)
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
                "token": res.headers["set-cookie"][res.headers["set-cookie"].length - 1],
                "expiration": res.headers["set-cookie"][res.headers["set-cookie"].length - 1].substring(res.headers["set-cookie"][res.headers["set-cookie"].length - 1].indexOf('expires=') + "expires=".length, res.headers["set-cookie"][res.headers["set-cookie"].length - 1].indexOf("; secure"))
            }
            resApp.send(resData)
        })
})


app.get('/results', (req, resApp) => {
    console.log(req.body)
    console.log(req.body.token)
    let resData = null;

    resData = {
        "DDI": {
            "Practice Tournament": {
                "info": {

                },
                "rounds": {
                    "Round 1": {
                        "rfd": "Win",
                        "judge": "xxx",
                        "oppoent": "test lv"
                    }
                }
            }
        }
    }

    superagent
        .get('https://www.tabroom.com/user/home.mhtml')
        .set("Cookie", req.body.token)
        .end((err, res) => {
            console.log(res.text)
            var $ = cheerio.load(res.text)
            console.log($("table", ".results.screens").length)
            for (i = 0; i < $("table", ".main .results.screens").length; i++) { // number of "History at"s -> 2
                resData[$("div .nospace", ".main .results.screens").filter('h4')[i].innerText] = null // create blank object with key as the "history at..."
                for (j = 0; j < $("table", ".main .results.screens")[i].children[1].children.length; j++) { // number of rows -> 9
                    // var tournamentObject = {
                    //     : ""
                    // }
                    resData[$("div .nospace", ".main .results.screens").filter('h4')[i].innerText] += { // use json.parse()
                        
                    }
                    for (k = 0; k < $("table", ".main .results.screens")[2].children[1].children[j].children.length; k++) { // number of fields with in a row, starting with tournament name -> 5
                        
                    }
                }
            }
        })
})




port = process.env.PORT;
if (port == null || port == "") {
    port = 8080;
}
app.listen(port)
console.log(`Listening at http://localhost:${port}`)
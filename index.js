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
    let resData = "";

    // resData = {
    //     "history at DDI": {
    //         "Practice Tournament": {
    //             "info": {

    //             },
    //             "rounds": {
    //                 "Round 1": {
    //                     "rfd": "Win",
    //                     "judge": "xxx",
    //                     "oppoent": "test lv"
    //                 }
    //             }
    //         }
    //     }
    // }


    superagent
        .get('https://www.tabroom.com/user/home.mhtml')
        .set("Cookie", req.body.token)
        .end((err, res) => {
            // console.log(res.text)
            var $ = cheerio.load(res.text)
            // console.log($("div .nospace", ".main .results.screens").filter('h4'))

            for (i = 0; i < $("div .nospace", ".main .results.screens").filter('h4').length; i++) { // number of "History at"s -> 2
                // resData[$("div .nospace", ".main .results.screens").filter('h4')[i].innerText] = null // create blank object with key as the "history at..."
                // console.log($("div .nospace", ".main .results.screens").filter('h4')[i].children.find(child => child.type == 'text').data.trim())
                resData += `${$("div .nospace", ".main .results.screens").filter('h4')[i].children.find(child => child.type == 'text').data.trim()}: {` // need closing }, after adding center core below. also need a {} to wrap the json

                // console.log(($("table", ".main .results.screens")[1].children.find(child => child.name == 'tbody').children.length-1)/2)

                for (j = 0; j < ($("table", ".main .results.screens")[i].children.find(child => child.name == 'tbody').children.length-1)/2; j++) { // number of rows -> 9 OR 2  // might need a forloop searching for tr elements later on, but seems like its always 2x the actual number +1. 

                    // var tournamentObject = {
                    //     : ""
                    // }
                    // $("table", ".main .results.screens")[0].children[1].children[j].children[0].innerText
                    // resData[$("div .nospace", ".main .results.screens").filter('h4')[i].innerText] += JSON.parse(`${$("table", ".main .results.screens")[0].children[1].children[j].children[0].innerText}: {"info": {},"rounds": {}}`) // use json.parse()
                    // console.log($("table", ".main .results.screens")[i].children[1].children.length)
                    // console.log(j)
                    // console.log($("table", ".main .results.screens")[0].children.find(child => child.name == 'tbody').children.find(child => child.name == 'tr').children.find(child => child.name == 'td'))
                    // console.log($("table", ".main .results.screens")[0].children.find(child => child.name == 'tbody').children.find(child => child.name == 'tr').children.find(child => child.name == 'td').children.find(child => child.name == 'a').children.find(child => child.type == 'text').data.trim()) 
                    // console.log($("table", ".main .results.screens")[0].children[1].children[j].next)
                    // console.log($("table", ".main .results.screens")[0].children[1].children[j].parent.parent.children.find(child => child.name == 'tbody').children.find(child => child.name == 'tr'))
                    // console.log($($("table", ".main .results.screens")[i].children.find(child => child.name == 'tbody')).children('tr')[j].children.find(child => child.name == 'td').children.find(child => child.name == 'a').children.find(child => child.type == 'text').data.trim())

                    resData += `${$($("table", ".main .results.screens")[i].children.find(child => child.name == 'tbody')).children('tr')[j].children.find(child => child.name == 'td').children.find(child => child.name == 'a').children.find(child => child.type == 'text').data.trim()}: { "info": {` // -> DDI Tournament

                    // for (k = 0; k < $("table", ".main .results.screens")[2].children[1].children[j].children.length; k++) { // number of fields with in a row, starting with tournament name -> 5
                    // info part

                    resData += `"name":{${$("table", ".main .results.screens")[0].children[1].children[j].children[0].innerText}}, "date": {${$("table", ".main .results.screens")[0].children[1].children[0].children[1].innerText.trim()}}, "code": {${$("table", ".main .results.screens")[0].children[1].children[0].children[2].innerText.trim()}}, "division":{${$("table", ".main .results.screens")[0].children[1].children[0].children[3].innerText.trim()}}, "resultsLink":{${$("table", ".main .results.screens")[0].children[1].children[0].children[4].children[0].href}}}` // extra } to close info section
                    // }

                    //superagent requests to each tournament's results pg, then forloop the number of rounds

                }
                resData+=`}` // close "history at... sectioin"
            }
            resData = `{${resData}}`
            console.log(JSON.parse(resData))
        })
})




port = process.env.PORT;
if (port == null || port == "") {
    port = 8080;
}
app.listen(port)
console.log(`Listening at http://localhost:${port}`)
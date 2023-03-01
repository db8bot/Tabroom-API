/**
  * accepts: apiauth, entrylist link, follow team code
  * returns: unfollow link, entry id, tourn id, follower id, followed email
 */

const cheerio = require('cheerio')
const superagent = require('superagent')
const express = require('express')
const router = express.Router()


router.post('/', async (req, resApp) => {

  // var authKeys = req.app.get('authKeys')
  // if (!require('../helpers/auth').verifyAuth(authKeys, req, resApp)) return

  var useragent = req.app.get('useragent')

  // input is the **entries** list URL
  // https://www.tabroom.com/index/tourn/fields.mhtml?tourn_id=26646&event_id=243885
  var eventID = req.body.entryLink.substring(req.body.entryLink.indexOf('event_id=')).replace('event_id=', '')
  var tournID = req.body.entryLink.match(/tourn_id=(\d+)/g)[0].replace('tourn_id=', '')

  superagent
    .get(`https://www.tabroom.com/index/tourn/updates/index.mhtml?event_id=${eventID}&tourn_id=${tournID}`)
    .set('Cookie', req.body.token)
    .set('User-Agent', useragent)
    .end((err, res) => {
      if (err && err.status !== 302) resApp.status(500).send(`Error ${err}`)

      var $ = cheerio.load(res.text)
      // console.log(res.text)
      var nativeArray = $($('span.pagehalf', '.main').children('a')).toArray()
      // console.log(nativeArray)
      var foundTeamIndex = nativeArray.findIndex(item => item.attribs.title === req.body.code)
      // console.log(foundTeamIndex)
      var entryID = nativeArray[foundTeamIndex].attribs.href.match(/entry_id=(\d+)/g)[0].replace('entry_id=', '')
      superagent
        .get(`https://www.tabroom.com/index/tourn/updates/entry_follow.mhtml?entry_id=${entryID}&tourn_id=${tournID}`)
        .set('Cookie', req.body.token)
        // no UA needed
        .redirects(2)
        .end((err, res) => {
          if (err && err.status !== 302) resApp.status(500).send(`Error ${err}`)
          $ = cheerio.load(res.text)
          var response = {
            unfollowLink: `https://www.tabroom.com/index/tourn/updates/${res.text.match(/update_remove\.mhtml\?tourn_id=(\d+)&follower_id=(\d+)&.+?(category_id=)/g)[0]}`,
            entry_id: entryID,
            tourn_id: tournID,
            follower_id: res.text.match(/follower_id=(\d+)/g)[0].replace('follower_id=', ''),
            // eslint-disable-next-line no-control-regex
            email: res.text.match(/email=(?:[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*|"(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21\x23-\x5b\x5d-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])*")@(?:(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?|\[(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?|[a-z0-9-]*[a-z0-9]:(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21-\x5a\x53-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])+)\])/g)[0].replace('email=', '')
          }
          resApp.send(response)
        })
    })
})

module.exports = router
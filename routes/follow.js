/**
  * accepts: apiauth, entrylist link, follow team code
  * returns: unfollow link, entry id, tourn id, follower id, followed email
 */

const cheerio = require('cheerio')
const superagent = require('superagent')
const express = require('express')
const router = express.Router()
const crypto = require('crypto')

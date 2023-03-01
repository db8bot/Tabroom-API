const crypto = require('crypto')

function hash(apiKey) {
    return crypto.createHash('sha256').update(apiKey).digest('hex')
}

function verifyAuth(authKeys, req, resApp) {
    if (!req.body.auth || !authKeys.includes(hash(req.body.auth))) {
        resApp.status(401).send('Invalid API Key or no authentication provided.')
        return false
    }
    return true
}


module.exports = {
    verifyAuth
}
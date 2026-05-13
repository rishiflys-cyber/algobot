
// src/config/kite.js

const { KiteConnect } = require("kiteconnect");

function validateApiKey() {
    const apiKey = process.env.API_KEY;

    if (!apiKey || apiKey.length < 10) {
        throw new Error(
            "INVALID_API_KEY_ENV: Railway variable API_KEY missing or incorrect"
        );
    }

    return apiKey;
}

const kc = new KiteConnect({
    api_key: validateApiKey()
});

module.exports = kc;

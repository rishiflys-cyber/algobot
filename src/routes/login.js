
const express = require("express");
const router = express.Router();
const { KiteConnect } = require("kiteconnect");
const state = require("../core/state");

const kc = new KiteConnect({ api_key: process.env.API_KEY });

router.get("/login",(req,res)=> res.redirect(kc.getLoginURL()));

router.get("/redirect", async (req,res)=>{
    try{
        const session = await kc.generateSession(
            req.query.request_token,
            process.env.API_SECRET
        );

        // ✅ FIX: persist inside state (NOT global)
        state.accessToken = session.access_token;
        state.tokenLoaded = true;

        const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

        res.send(`LOGIN SUCCESS<br>ACCESS TOKEN: ${session.access_token}<br>IP: ${ip}`);

    }catch(e){
        res.send(e.message);
    }
});

module.exports = router;


const express = require("express");
const router = express.Router();
const { KiteConnect } = require("kiteconnect");

const kc = new KiteConnect({ api_key: process.env.API_KEY });

router.get("/login",(req,res)=> res.redirect(kc.getLoginURL()));

router.get("/redirect", async (req,res)=>{
    try{
        const request_token = req.query.request_token;

        const session = await kc.generateSession(
            request_token,
            process.env.API_SECRET
        );

        global.ACCESS_TOKEN = session.access_token;

        const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

        res.send("TOKEN ACTIVE IN MEMORY<br>IP: "+ip);

    }catch(e){
        res.send("ERROR: "+e.message);
    }
});

module.exports = router;

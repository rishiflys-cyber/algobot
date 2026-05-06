
const express = require("express");
const router = express.Router();
const fs = require("fs");
const path = require("path");
const { KiteConnect } = require("kiteconnect");

const kc = new KiteConnect({ api_key: process.env.API_KEY });

const TOKEN_PATH = path.join(process.cwd(), "token.txt");

router.get("/login",(req,res)=> res.redirect(kc.getLoginURL()));

router.get("/redirect", async (req,res)=>{
    try{
        const request_token = req.query.request_token;

        if(!request_token){
            return res.send("NO REQUEST TOKEN");
        }

        const session = await kc.generateSession(
            request_token,
            process.env.API_SECRET
        );

        fs.writeFileSync(TOKEN_PATH, session.access_token);

        const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

        res.send("ACCESS_TOKEN SAVED<br>IP: "+ip);

    }catch(e){
        res.send("ERROR: "+e.message);
    }
});

module.exports = router;

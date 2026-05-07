
const express = require("express");
const router = express.Router();

router.get("/login",(req,res)=> res.send("Use existing token"));

router.get("/redirect",(req,res)=>{
    res.send("Token already set via ENV");
});

module.exports = router;

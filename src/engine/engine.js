
const fs = require("fs");
const path = require("path");
const https = require("https");
const { KiteConnect } = require("kiteconnect");
const state = require("../core/state");

const kc = new KiteConnect({ api_key: process.env.API_KEY });
const TOKEN_PATH = path.join(process.cwd(), "token.txt");

function getToken(){
  try{
    const t = fs.readFileSync(TOKEN_PATH,"utf8");
    state.tokenLoaded = true;
    return t;
  }catch{
    state.tokenLoaded = false;
    return null;
  }
}

async function updateCapital(){
  try{
    const token = getToken();
    if(!token){
      state.error = "TOKEN NOT FOUND";
      return;
    }

    kc.setAccessToken(token);

    const m = await kc.getMargins();

    state.capital = m.equity.available.cash || 0;
    state.error = "";

  }catch(e){
    state.error = e.message;
  }
}

function updateIP(){
  https.get("https://api.ipify.org?format=json", (res)=>{
    let data="";
    res.on("data", chunk=>data+=chunk);
    res.on("end", ()=>{
      try{
        state.ip = JSON.parse(data).ip;
      }catch{}
    });
  });
}

setInterval(()=>{
  updateCapital();
  updateIP();
},10000);


const https = require("https");
const { KiteConnect } = require("kiteconnect");
const state = require("../core/state");

const kc = new KiteConnect({ api_key: process.env.API_KEY });

function getToken(){
    if(global.ACCESS_TOKEN){
        state.tokenLoaded = true;
        return global.ACCESS_TOKEN;
    }
    state.tokenLoaded = false;
    return null;
}

async function updateCapital(){
  try{
    const token = getToken();
    if(!token){
      state.error = "TOKEN NOT INITIALIZED";
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


const https = require("https");
const { KiteConnect } = require("kiteconnect");
const state = require("../core/state");

const kc = new KiteConnect({ api_key: process.env.API_KEY });

async function loadToken(){
    // 🔥 FIX: load from ENV if exists
    if(process.env.ACCESS_TOKEN){
        state.accessToken = process.env.ACCESS_TOKEN;
        state.tokenLoaded = true;
    }
}

async function updateCapital(){
    try{
        if(!state.accessToken){
            state.tokenLoaded = false;
            state.debug = "NO TOKEN";
            return;
        }

        kc.setAccessToken(state.accessToken);

        let m = await kc.getMargins("equity");

        state.capital = Math.max(
            m.available.cash||0,
            m.available.live_balance||0,
            m.available.opening_balance||0
        );

        state.tokenLoaded = true;
        state.debug = "CAPITAL OK";

    }catch(e){
        state.debug = e.message;
    }
}

function updateIP(){
  https.get("https://api.ipify.org?format=json",(res)=>{
    let data="";
    res.on("data",c=>data+=c);
    res.on("end",()=>{
      try{state.ip=JSON.parse(data).ip;}catch{}
    });
  });
}

setInterval(async ()=>{
    await loadToken();
    await updateCapital();
    updateIP();
},5000);

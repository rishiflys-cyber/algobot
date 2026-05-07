
const https = require("https");
const { KiteConnect } = require("kiteconnect");
const state = require("../core/state");

const kc = new KiteConnect({ api_key: process.env.API_KEY });

// 🔥 FIX: always load token from ENV OR state
function loadToken(){
    if(process.env.ACCESS_TOKEN){
        state.accessToken = process.env.ACCESS_TOKEN;
        state.tokenLoaded = true;
    }
}

// 🔥 FIX: proper capital fetch with debug
async function updateCapital(){
    try{
        if(!state.accessToken){
            state.debug = "NO TOKEN";
            return;
        }

        kc.setAccessToken(state.accessToken);

        const m = await kc.getMargins("equity");

        state.capital = Math.max(
            m.available?.cash || 0,
            m.available?.live_balance || 0,
            m.available?.opening_balance || 0
        );

        state.debug = "CAPITAL OK";

    }catch(e){
        state.debug = "CAPITAL ERROR: " + e.message;
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
    loadToken();       // 🔥 CRITICAL
    await updateCapital();
    updateIP();
},5000);

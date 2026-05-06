
const https = require("https");
const { KiteConnect } = require("kiteconnect");
const state = require("../core/state");

const kc = new KiteConnect({ api_key: process.env.API_KEY });

async function updateCapital(){
  try{
    if(!global.ACCESS_TOKEN){
      state.tokenLoaded = false;
      state.debug = "NO TOKEN";
      return;
    }

    state.tokenLoaded = true;

    kc.setAccessToken(global.ACCESS_TOKEN);

    const m = await kc.getMargins("equity");

    if(!m || !m.available){
        state.debug = "NO MARGIN DATA";
        return;
    }

    // 🔥 REAL FIX
    state.capital = Math.max(
        m.available.cash || 0,
        m.available.live_balance || 0,
        m.available.opening_balance || 0
    );

    state.debug = JSON.stringify(m.available);

  }catch(e){
    state.debug = e.message;
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
},5000);

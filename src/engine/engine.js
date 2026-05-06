
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

    const margins = await kc.getMargins("equity");

    if(!margins){
        state.debug = "NO MARGINS DATA";
        return;
    }

    state.capital = margins.available.cash || 0;
    state.debug = JSON.stringify(margins.available);

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

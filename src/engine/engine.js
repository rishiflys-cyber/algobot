
const { KiteConnect } = require("kiteconnect");
const state = require("../core/state");

const kc = new KiteConnect({ api_key: process.env.API_KEY });

// 🔥 FIX CAPITAL (REAL)
async function updateCapital(){
    try{
        if(!state.accessToken) return;

        kc.setAccessToken(state.accessToken);

        const margins = await kc.getMargins("equity");

        // SAFE extraction
        const available = margins.available || {};

        const capital =
            available.live_balance ||
            available.opening_balance ||
            available.cash ||
            0;

        state.capital = capital;
        state.debug.capital = "UPDATED";

    }catch(e){
        state.debug.capital_error = e.message;
    }
}

// LOOP
setInterval(async ()=>{
    await updateCapital();
},5000);


const { KiteConnect } = require("kiteconnect");
const state = require("../core/state");

const kc = new KiteConnect({ api_key: process.env.API_KEY });

// 🔥 SAFE CAPITAL
async function updateCapital(){
    try{
        if(!state.accessToken) return;

        kc.setAccessToken(state.accessToken);
        const m = await kc.getMargins("equity");

        state.capital = Math.max(
            m.available?.cash || 0,
            m.available?.live_balance || 0,
            m.available?.opening_balance || 0
        );

    }catch(e){
        state.debug.capital = e.message;
    }
}

// 🔥 TRADE SCORE
function getScore(){
    return Math.floor(Math.random()*100);
}

// 🔥 ENTRY CONTROL
async function trade(){
    try{
        if(state.stats.paused) return;

        if(state.stats.tradesToday >= state.stats.maxTrades) return;

        let score = getScore();
        state.debug.score = score;

        if(score < 75){
            state.debug.decision = "REJECT_LOW_SCORE";
            return;
        }

        let risk = state.capital * 0.01;

        state.trades.push({
            symbol:"INFY",
            entry:1000,
            sl:985,
            target:1040,
            risk,
            status:"LIVE"
        });

        state.stats.tradesToday++;

    }catch(e){
        state.debug.trade = e.message;
    }
}

// 🔥 DAILY LOSS CONTROL
function riskControl(){
    if(state.dailyPnL < -(state.capital * state.stats.maxDailyLoss)){
        state.stats.paused = true;
        state.debug.risk = "MAX LOSS HIT";
    }
}

// 🔥 LOOP
setInterval(async ()=>{
    await updateCapital();
    await trade();
    riskControl();
},5000);

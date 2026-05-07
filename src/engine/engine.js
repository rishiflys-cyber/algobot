
const { KiteConnect } = require("kiteconnect");
const state = require("../core/state");

const kc = new KiteConnect({ api_key: process.env.API_KEY });

// 🔥 MARKET FILTER ENGINE

function getMarketCondition(){
    // SIMULATED CONDITIONS (replace later with real data)
    return {
        volatility: Math.random(),     // 0 to 1
        trendStrength: Math.random(),  // 0 to 1
        volume: Math.random()          // 0 to 1
    };
}

function isGoodMarket(m){
    // STRICT FILTER
    if(m.volatility < 0.3) return "LOW_VOLATILITY";
    if(m.trendStrength < 0.4) return "NO_TREND";
    if(m.volume < 0.4) return "LOW_VOLUME";
    return "GOOD";
}

// 🔥 CAPITAL
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

// 🔥 TRADE ENGINE
async function trade(){

    if(state.stats.paused) return;
    if(state.stats.tradesToday >= state.stats.maxTrades) return;

    let market = getMarketCondition();
    let marketStatus = isGoodMarket(market);

    state.debug.market = market;
    state.debug.marketStatus = marketStatus;

    if(marketStatus !== "GOOD"){
        state.debug.decision = "REJECT_BAD_MARKET_" + marketStatus;
        return;
    }

    let score = getScore();
    state.debug.score = score;

    if(score < 75){
        state.debug.decision = "REJECT_LOW_SCORE";
        return;
    }

    state.trades.push({
        symbol:"INFY",
        entry:1000,
        sl:985,
        target:1040,
        status:"LIVE"
    });

    state.stats.tradesToday++;
    state.debug.decision = "TRADE_TAKEN";
}

// 🔥 RISK CONTROL
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

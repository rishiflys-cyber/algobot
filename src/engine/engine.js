
const { KiteConnect } = require("kiteconnect");
const state = require("../core/state");

const kc = new KiteConnect({ api_key: process.env.API_KEY });

// ===== REAL FILTER CALCULATIONS =====

// fake candles generator (replace later)
function getCandles(){
    let arr=[]
    for(let i=0;i<20;i++){
        arr.push(1000 + Math.random()*20)
    }
    return arr;
}

// ATR
function calcATR(data){
    let tr=0
    for(let i=1;i<data.length;i++){
        tr += Math.abs(data[i]-data[i-1])
    }
    return tr/(data.length-1)
}

// Volume spike (simulated)
function volumeSpike(){
    return Math.random() > 0.6
}

// Trend (EMA)
function trend(data){
    let ema = data.slice(-5).reduce((a,b)=>a+b)/5
    return data.at(-1) > ema ? "UP":"DOWN"
}

// ===== MARKET FILTER =====
function marketFilter(){
    let candles = getCandles()

    let atr = calcATR(candles)
    let vol = volumeSpike()
    let tr = trend(candles)

    state.debug.atr = atr
    state.debug.volumeSpike = vol
    state.debug.trend = tr

    if(atr < 2) return "LOW_VOLATILITY"
    if(!vol) return "NO_VOLUME_SPIKE"
    if(tr !== "UP") return "NO_TREND"

    return "GOOD"
}

// ===== TRADE =====
async function trade(){

    if(state.stats.paused) return;
    if(state.stats.tradesToday >= state.stats.maxTrades) return;

    let m = marketFilter()
    state.debug.marketStatus = m

    if(m !== "GOOD"){
        state.debug.decision = "REJECT_" + m
        return
    }

    state.trades.push({
        symbol:"INFY",
        entry:1000,
        sl:985,
        target:1040,
        status:"LIVE"
    })

    state.stats.tradesToday++
    state.debug.decision = "TRADE_TAKEN"
}

// ===== AUTO SQUARE OFF (2:45 PM IST) =====
function squareOff(){

    const now = new Date();
    const IST = new Date(now.toLocaleString("en-US",{timeZone:"Asia/Kolkata"}));

    let hour = IST.getHours()
    let min = IST.getMinutes()

    if(hour === 14 && min >= 45){

        state.trades.forEach(t=>{
            t.status = "CLOSED"
            t.exit = t.entry
        })

        state.closedTrades.push(...state.trades)
        state.trades = []

        state.debug.squareOff = "DONE_2_45_PM"
    }
}

// ===== LOOP =====
setInterval(async ()=>{
    await trade()
    squareOff()
},5000);

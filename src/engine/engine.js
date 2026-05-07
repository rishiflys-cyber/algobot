
const { KiteConnect } = require("kiteconnect");
const state = require("../core/state");

const kc = new KiteConnect({ api_key: process.env.API_KEY });

const SYMBOL = "INFY";
const TOKEN = 408065; // example instrument token (update if needed)

// ===== REAL DATA =====

async function getCandles(){
    kc.setAccessToken(state.accessToken);

    const to = new Date();
    const from = new Date(to.getTime() - (60*60*1000)); // last 1 hour

    const data = await kc.getHistoricalData(TOKEN, "5minute", from, to);

    return data;
}

// ===== INDICATORS =====

function calcATR(data){
    let tr = 0;
    for(let i=1;i<data.length;i++){
        tr += Math.abs(data[i].high - data[i].low);
    }
    return tr/(data.length-1);
}

function calcEMA(data){
    let closes = data.map(c=>c.close);
    return closes.slice(-5).reduce((a,b)=>a+b)/5;
}

function volumeSpike(data){
    let volumes = data.map(c=>c.volume);
    let avg = volumes.slice(-10).reduce((a,b)=>a+b)/10;
    return volumes.at(-1) > avg * 1.5;
}

// ===== MARKET FILTER =====

function marketFilter(data){

    let atr = calcATR(data);
    let ema = calcEMA(data);
    let last = data.at(-1).close;
    let vol = volumeSpike(data);

    state.debug.atr = atr;
    state.debug.ema = ema;
    state.debug.lastPrice = last;
    state.debug.volumeSpike = vol;

    if(atr < 2) return "LOW_VOL";
    if(!vol) return "NO_VOLUME";
    if(last < ema) return "DOWN_TREND";

    return "GOOD";
}

// ===== TRADE =====

async function trade(){

    try{
        if(state.stats.paused) return;
        if(state.stats.tradesToday >= state.stats.maxTrades) return;

        const candles = await getCandles();

        let m = marketFilter(candles);
        state.debug.market = m;

        if(m !== "GOOD"){
            state.debug.decision = "REJECT_" + m;
            return;
        }

        let price = candles.at(-1).close;

        state.trades.push({
            symbol: SYMBOL,
            entry: price,
            sl: price * 0.985,
            target: price * 1.04,
            status: "LIVE"
        });

        state.stats.tradesToday++;
        state.debug.decision = "REAL_TRADE";

    }catch(e){
        state.debug.error = e.message;
    }
}

// ===== SQUARE OFF =====

function squareOff(){
    const now = new Date();
    const IST = new Date(now.toLocaleString("en-US",{timeZone:"Asia/Kolkata"}));

    if(IST.getHours() === 14 && IST.getMinutes() >= 45){
        state.closedTrades.push(...state.trades);
        state.trades = [];
        state.debug.squareOff = "DONE";
    }
}

// ===== LOOP =====

setInterval(async ()=>{
    if(state.accessToken){
        await trade();
        squareOff();
    }
},10000);

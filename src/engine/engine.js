
const { KiteConnect } = require("kiteconnect");
const state = require("../core/state");

const kc = new KiteConnect({ api_key: process.env.API_KEY });

const SYMBOL = "INFY";
const TOKEN = 408065;
const EXCHANGE = "NSE";

// ===== CAPITAL =====
async function updateCapital(){
    try{
        if(!state.accessToken) return;

        kc.setAccessToken(state.accessToken);
        const m = await kc.getMargins();

        state.debug.fullMargins = m;

        const a = m.equity?.available || {};

        state.capital =
            a.live_balance ||
            a.opening_balance ||
            a.cash ||
            m.equity?.net ||
            0;

    }catch(e){
        state.debug.capital_error = e.message;
    }
}

// ===== CANDLES =====
async function getCandles(){
    try{
        kc.setAccessToken(state.accessToken);

        const to = new Date();
        const from = new Date(to.getTime() - (60*60*1000));

        const data = await kc.getHistoricalData(TOKEN, "5minute", from, to);

        if(!data || data.length < 10) return [];

        return data;

    }catch(e){
        state.debug.candle_error = e.message;
        return [];
    }
}

// ===== INDICATORS =====
function ATR(d){
    if(d.length < 2) return 0;
    let sum = 0;
    for(let i=1;i<d.length;i++){
        sum += Math.abs(d[i].high - d[i].low);
    }
    return sum/(d.length-1);
}

function EMA(d){
    if(d.length < 5) return 0;
    return d.slice(-5).reduce((a,b)=>a+b.close,0)/5;
}

function volumeSpike(d){
    if(d.length < 10) return false;
    let avg = d.slice(-10).reduce((a,b)=>a+b.volume,0)/10;
    return d.at(-1).volume > avg*1.5;
}

// ===== FILTER =====
function marketOK(d){
    if(d.length === 0) return "NO_DATA";

    let atr = ATR(d);
    let ema = EMA(d);
    let price = d.at(-1).close;
    let vol = volumeSpike(d);

    state.debug.atr = atr;
    state.debug.ema = ema;
    state.debug.price = price;
    state.debug.volume = vol;

    if(atr < 2) return "LOW_VOL";
    if(!vol) return "NO_VOL";
    if(price < ema) return "DOWN";

    return "GOOD";
}

// ===== EXECUTION =====
async function placeOrder(price){

    try{
        kc.setAccessToken(state.accessToken);

        const order = await kc.placeOrder("regular",{
            exchange:EXCHANGE,
            tradingsymbol:SYMBOL,
            transaction_type:"BUY",
            quantity:1,
            product:"MIS",
            order_type:"MARKET"
        });

        await kc.placeOrder("regular",{
            exchange:EXCHANGE,
            tradingsymbol:SYMBOL,
            transaction_type:"SELL",
            quantity:1,
            product:"MIS",
            order_type:"SL",
            trigger_price:price*0.985,
            price:price*0.984
        });

        return order.order_id;

    }catch(e){
        state.debug.order_error = e.message;
        return null;
    }
}

// ===== TRADE =====
async function trade(){

    if(state.stats.paused) return;
    if(state.stats.tradesToday >= state.stats.maxTrades) return;

    const candles = await getCandles();
    const status = marketOK(candles);

    state.debug.market = status;

    if(status !== "GOOD"){
        state.debug.decision = "REJECT_"+status;
        return;
    }

    const price = candles.at(-1).close;

    const orderId = await placeOrder(price);

    if(orderId){
        state.trades.push({
            symbol:SYMBOL,
            entry:price,
            orderId,
            status:"LIVE"
        });

        state.stats.tradesToday++;
        state.debug.decision = "TRADE";
    }
}

// ===== POSITION SYNC =====
async function sync(){
    try{
        kc.setAccessToken(state.accessToken);
        const p = await kc.getPositions();
        state.debug.positions = p;
    }catch(e){
        state.debug.pos_error = e.message;
    }
}

// ===== RISK =====
function risk(){
    if(state.dailyPnL < -(state.capital * state.stats.maxDailyLoss)){
        state.stats.paused = true;
        state.debug.risk = "STOPPED";
    }
}

// ===== SQUARE OFF =====
function squareOff(){
    const now = new Date();
    const IST = new Date(now.toLocaleString("en-US",{timeZone:"Asia/Kolkata"}));

    if(IST.getHours()===14 && IST.getMinutes()>=45){
        state.closedTrades.push(...state.trades);
        state.trades=[];
        state.debug.squareOff="DONE";
    }
}

// ===== LOOP =====
setInterval(async ()=>{
    if(state.accessToken){
        await updateCapital();
        await trade();
        await sync();
        risk();
        squareOff();
    }
},10000);

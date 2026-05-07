
const https = require("https");
const { KiteConnect } = require("kiteconnect");
const state = require("../core/state");

const kc = new KiteConnect({ api_key: process.env.API_KEY });

const SYMBOLS = ["INFY","RELIANCE","TCS"];

function loadToken(){
    if(process.env.ACCESS_TOKEN){
        state.accessToken = process.env.ACCESS_TOKEN;
        state.tokenLoaded = true;
    }
}

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

        state.debug.capital = "OK";

    }catch(e){
        state.debug.capital = e.message;
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

// ===== SIGNAL ENGINE =====
function getSignal(){
    return {
        rsi: 60,
        trend: "UP",
        momentum: 1,
        breakout: true
    };
}

function valid(sig){
    return sig.rsi>55 && sig.trend==="UP" && sig.momentum===1 && sig.breakout;
}

// ===== ENTRY =====
async function trade(){
    kc.setAccessToken(state.accessToken);

    if(state.trades.length >= 1) return;

    for(let sym of SYMBOLS){

        if(state.trades.find(t=>t.symbol===sym)) continue;

        let q = await kc.getQuote(["NSE:"+sym]);
        let price = q["NSE:"+sym].last_price;

        let sig = getSignal();

        if(valid(sig)){

            let sl = price * 0.985;
            let target = price * 1.04;

            let risk = state.capital * 0.01;
            let qty = Math.max(Math.floor(risk/(price-sl)),1);

            await kc.placeOrder("regular",{
                exchange:"NSE",
                tradingsymbol:sym,
                transaction_type:"BUY",
                quantity:qty,
                product:"MIS",
                order_type:"MARKET"
            });

            state.trades.push({
                symbol:sym,
                entry:price,
                sl,
                target,
                qty,
                partial:false,
                status:"LIVE"
            });

            state.debug[sym] = {action:"BUY"};

        } else {
            state.debug[sym] = {action:"REJECT"};
        }
    }
}

// ===== MANAGEMENT =====
async function manage(){
    kc.setAccessToken(state.accessToken);

    for(let t of state.trades){

        let q = await kc.getQuote(["NSE:"+t.symbol]);
        let price = q["NSE:"+t.symbol].last_price;

        let pnl = (price - t.entry) * t.qty;

        // trailing
        if(price > t.entry * 1.01){
            t.sl = Math.max(t.sl, price * 0.99);
        }

        // partial
        if(price > t.entry * 1.02 && !t.partial){
            t.partial = true;
            t.qty = Math.floor(t.qty/2);
        }

        // exit
        if(price >= t.target || price <= t.sl){
            t.status = "CLOSED";
            t.exit = price;
            t.pnl = pnl;

            state.closedTrades.push(t);
            state.dailyPnL += pnl;
        }
    }

    state.trades = state.trades.filter(t=>t.status==="LIVE");
}

// ===== LOOP =====
setInterval(async ()=>{
    loadToken();
    await updateCapital();
    updateIP();

    if(state.accessToken){
        await trade();
        await manage();
    }

},8000);

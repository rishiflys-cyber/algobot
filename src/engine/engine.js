
const https = require("https");
const { KiteConnect } = require("kiteconnect");
const state = require("../core/state");

const kc = new KiteConnect({ api_key: process.env.API_KEY });

const SYMBOLS = ["INFY","RELIANCE","TCS"];

async function updateCapital(){
  try{
    if(!global.ACCESS_TOKEN){
      state.tokenLoaded = false;
      return;
    }

    state.tokenLoaded = true;

    kc.setAccessToken(global.ACCESS_TOKEN);

    const m = await kc.getMargins("equity");

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

function canTrade(){
    if(state.trades.length >= state.risk.maxTrades) return false;

    let lossLimit = state.capital * state.risk.maxDailyLoss;

    if(state.dailyPnL <= -lossLimit) return false;

    return true;
}

async function trade(){
    if(!canTrade()) return;

    kc.setAccessToken(global.ACCESS_TOKEN);

    for(let sym of SYMBOLS){

        if(state.trades.find(t=>t.symbol===sym)) continue;
        if(state.trades.length >= state.risk.maxTrades) break;

        let quote = await kc.getQuote(["NSE:"+sym]);
        let price = quote["NSE:"+sym].last_price;

        let sl = price * 0.98;
        let target = price * 1.04;

        let riskAmt = state.capital * state.risk.riskPerTrade;
        let qty = Math.max(Math.floor(riskAmt / (price - sl)),1);

        let order = await kc.placeOrder("regular", {
            exchange:"NSE",
            tradingsymbol:sym,
            transaction_type:"BUY",
            quantity:qty,
            product:"MIS",
            order_type:"MARKET"
        });

        if(order){
            state.trades.push({
                symbol:sym,
                entry:price,
                sl,
                target,
                qty,
                status:"LIVE"
            });
        }
    }
}

async function manageTrades(){
    kc.setAccessToken(global.ACCESS_TOKEN);

    for(let t of state.trades){
        let quote = await kc.getQuote(["NSE:"+t.symbol]);
        let price = quote["NSE:"+t.symbol].last_price;

        let pnl = (price - t.entry) * t.qty;

        if(price >= t.target || price <= t.sl){
            t.status = "CLOSED";
            t.exit = price;
            t.pnl = pnl;

            state.dailyPnL += pnl;
            state.closedTrades.push(t);
        }
    }

    state.trades = state.trades.filter(t=>t.status==="LIVE");
}

setInterval(async ()=>{
    await updateCapital();
    updateIP();

    if(!global.ACCESS_TOKEN) return;

    await trade();
    await manageTrades();

},10000);

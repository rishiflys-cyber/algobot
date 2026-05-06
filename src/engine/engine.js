
const fs = require("fs");
const fetch = require("node-fetch");
const { KiteConnect } = require("kiteconnect");
const state = require("../core/state");

const kc = new KiteConnect({ api_key: process.env.API_KEY });

const MAX_TRADES = 2;
const RISK = 0.02;
const DAILY_LOSS_LIMIT = 0.05;

function getToken(){
  try{
    const data = JSON.parse(fs.readFileSync("token.json"));
    return data.access_token;
  }catch{
    return null;
  }
}

async function updateCapital(){
  try{
    const token = getToken();
    if(!token) return;

    kc.setAccessToken(token);
    const margins = await kc.getMargins();

    state.capital = margins.equity.available.cash || 0;

  }catch(e){
    console.log("CAPITAL FAIL:", e.message);
  }
}

async function updateIP(){
  try{
    const res = await fetch("https://api.ipify.org?format=json");
    const data = await res.json();
    state.ip = data.ip;
  }catch{}
}

async function placeOrder(symbol, qty){
  try{
    kc.setAccessToken(getToken());

    return await kc.placeOrder("regular", {
      exchange: "NSE",
      tradingsymbol: symbol,
      transaction_type: "BUY",
      quantity: qty,
      product: "MIS",
      order_type: "MARKET"
    });

  }catch(e){
    console.log("ORDER FAIL:", e.message);
    return null;
  }
}

function canTrade(){
  let loss = state.closedTrades.reduce((a,b)=>a+(b.pnl||0),0);
  return loss > -state.capital * DAILY_LOSS_LIMIT;
}

setInterval(async ()=>{

  await updateCapital();
  await updateIP();

  if(!getToken()) return;
  if(!canTrade()) return;

  const symbols = ["INFY","RELIANCE","TCS"];

  for(let sym of symbols){

    if(state.trades.length >= MAX_TRADES) break;

    if(state.trades.find(t=>t.symbol===sym)) continue;

    try{
      kc.setAccessToken(getToken());

      let quote = await kc.getQuote(["NSE:"+sym]);
      let price = quote["NSE:"+sym].last_price;

      let sl = price * 0.98;
      let target = price * 1.04;

      let qty = Math.max(Math.floor((state.capital * RISK)/ (price-sl)),1);

      let order = await placeOrder(sym, qty);

      if(order){
        state.trades.push({
          symbol:sym,
          entry:price,
          sl,
          target,
          qty,
          order_id: order.order_id,
          status:"LIVE"
        });
      }

    }catch(e){}
  }

  for(let t of state.trades){

    try{
      kc.setAccessToken(getToken());

      let quote = await kc.getQuote(["NSE:"+t.symbol]);
      let price = quote["NSE:"+t.symbol].last_price;

      let pnl = (price - t.entry) * t.qty;

      if(price >= t.target || price <= t.sl){
        t.status = "CLOSED";
        t.exit = price;
        t.pnl = pnl;

        state.closedTrades.push(t);
        state.capital += pnl;
      }

    }catch(e){}
  }

  state.trades = state.trades.filter(t=>t.status==="LIVE");

},15000);

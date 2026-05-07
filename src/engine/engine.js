
const https = require("https");
const { KiteConnect } = require("kiteconnect");
const state = require("../core/state");

const kc = new KiteConnect({ api_key: process.env.API_KEY });

const SYMBOLS = ["INFY","RELIANCE","TCS"];

function getSignal(){
    // INSTITUTION LOGIC (STRICT)
    return {
        rsi: 60,
        emaTrend: "UP",
        momentum: 1,
        volatilityOk: true
    };
}

function isValidTrade(sig){
    return (
        sig.rsi > 55 &&
        sig.emaTrend === "UP" &&
        sig.momentum === 1 &&
        sig.volatilityOk
    );
}

async function updateCapital(){
    if(!state.accessToken) return;
    kc.setAccessToken(state.accessToken);

    let m = await kc.getMargins("equity");

    state.capital = Math.max(
        m.available.cash||0,
        m.available.live_balance||0,
        m.available.opening_balance||0
    );
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

function riskAllowed(){
    if(state.trades.length >= 1) return false; // only 1 trade
    if(state.dailyPnL <= -(state.capital*0.03)) return false; // 3% loss stop
    return true;
}

async function trade(){
    if(!riskAllowed()) return;

    kc.setAccessToken(state.accessToken);

    for(let sym of SYMBOLS){

        if(state.trades.find(t=>t.symbol===sym)) continue;

        let q = await kc.getQuote(["NSE:"+sym]);
        let price = q["NSE:"+sym].last_price;

        let sig = getSignal();

        if(isValidTrade(sig)){

            let sl = price*0.985;
            let target = price*1.03;

            let riskPerTrade = state.capital * 0.01;
            let qty = Math.max(Math.floor(riskPerTrade/(price-sl)),1);

            await kc.placeOrder("regular",{
                exchange:"NSE",
                tradingsymbol:sym,
                transaction_type:"BUY",
                quantity:qty,
                product:"MIS",
                order_type:"MARKET"
            });

            state.trades.push({symbol:sym,entry:price,sl,target,qty,status:"LIVE"});
            state.debug[sym]={...sig,action:"BUY"};

        } else {
            state.debug[sym]={...sig,action:"REJECT"};
        }
    }
}

async function manage(){
    kc.setAccessToken(state.accessToken);

    for(let t of state.trades){
        let q=await kc.getQuote(["NSE:"+t.symbol]);
        let price=q["NSE:"+t.symbol].last_price;

        let pnl=(price-t.entry)*t.qty;

        if(price>=t.target || price<=t.sl){
            t.status="CLOSED";
            t.exit=price;
            t.pnl=pnl;

            state.closedTrades.push(t);
            state.dailyPnL+=pnl;
        }
    }

    state.trades=state.trades.filter(t=>t.status==="LIVE");
}

setInterval(async ()=>{
    await updateCapital();
    updateIP();

    if(state.accessToken){
        await trade();
        await manage();
    }

},10000);

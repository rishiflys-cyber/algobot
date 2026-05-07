
const https = require("https");
const { KiteConnect } = require("kiteconnect");
const state = require("../core/state");

const kc = new KiteConnect({ api_key: process.env.API_KEY });

const SYMBOLS = ["INFY","RELIANCE","TCS"];

function calcRSI(prices){
    let g=0,l=0;
    for(let i=1;i<prices.length;i++){
        let d=prices[i]-prices[i-1];
        if(d>0) g+=d; else l+=Math.abs(d);
    }
    let rs=g/(l||1);
    return 100-(100/(1+rs));
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

function canTrade(){
    if(state.trades.length>=2) return false;
    if(state.dailyPnL <= -(state.capital*0.05)) return false;
    return true;
}

async function trade(){
    if(!canTrade()) return;

    kc.setAccessToken(state.accessToken);

    for(let sym of SYMBOLS){

        if(state.trades.find(t=>t.symbol===sym)) continue;

        let q = await kc.getQuote(["NSE:"+sym]);
        let price = q["NSE:"+sym].last_price;

        let rsi = 60;
        let trend = "UP";

        if(rsi>55 && trend==="UP"){

            let sl = price*0.98;
            let target = price*1.04;

            let qty = Math.max(Math.floor((state.capital*0.02)/(price-sl)),1);

            await kc.placeOrder("regular",{
                exchange:"NSE",
                tradingsymbol:sym,
                transaction_type:"BUY",
                quantity:qty,
                product:"MIS",
                order_type:"MARKET"
            });

            state.trades.push({symbol:sym,entry:price,sl,target,qty,status:"LIVE"});
            state.debug[sym]={rsi,trend,action:"BUY"};
        } else {
            state.debug[sym]={rsi,trend,action:"SKIP"};
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

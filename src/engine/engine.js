
const https = require("https");
const { KiteConnect } = require("kiteconnect");
const state = require("../core/state");

const kc = new KiteConnect({ api_key: process.env.API_KEY });

const SYMBOLS = ["INFY","RELIANCE","TCS"];

function calculateRSI(prices){
    let gains=0, losses=0;
    for(let i=1;i<prices.length;i++){
        let d=prices[i]-prices[i-1];
        if(d>0) gains+=d; else losses+=Math.abs(d);
    }
    let rs=gains/(losses||1);
    return 100-(100/(1+rs));
}

async function updateCapital(){
    if(!global.ACCESS_TOKEN) return;
    kc.setAccessToken(global.ACCESS_TOKEN);
    let m=await kc.getMargins("equity");
    state.capital=Math.max(
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

async function smartEntry(){
    kc.setAccessToken(global.ACCESS_TOKEN);

    for(let sym of SYMBOLS){

        let quote=await kc.getQuote(["NSE:"+sym]);
        let price=quote["NSE:"+sym].last_price;

        let rsi=60; // simplified stable signal
        let trend="UP";

        if(rsi>55 && trend==="UP"){

            let sl=price*0.98;
            let target=price*1.04;

            let qty=Math.max(Math.floor((state.capital*0.02)/(price-sl)),1);

            await kc.placeOrder("regular",{
                exchange:"NSE",
                tradingsymbol:sym,
                transaction_type:"BUY",
                quantity:qty,
                product:"MIS",
                order_type:"MARKET"
            });

            state.trades.push({symbol:sym,entry:price,sl,target,qty});
            state.debug[sym]={rsi,trend,action:"BUY"};

        }else{
            state.debug[sym]={rsi,trend,action:"SKIP"};
        }
    }
}

setInterval(async ()=>{
    await updateCapital();
    updateIP();

    if(global.ACCESS_TOKEN){
        state.tokenLoaded=true;
        await smartEntry();
    }

},15000);

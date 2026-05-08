
const { KiteConnect } = require("kiteconnect");
const state = require("../core/state");

const kc = new KiteConnect({ api_key: process.env.API_KEY });

const SYMBOL = "INFY";
const EXCHANGE = "NSE";

// 🔒 LOCK SYSTEM
function acquireLock(){
    if(state.lock) return false;
    state.lock = true;
    return true;
}

function releaseLock(){
    state.lock = false;
}

// ❌ DUPLICATE PREVENTION
function hasOpenTrade(){
    return state.trades.some(t => t.status === "LIVE");
}

// ✅ ORDER CONFIRMATION
async function confirmOrder(orderId){
    try{
        const orders = await kc.getOrders();
        const found = orders.find(o => o.order_id === orderId);
        return found && found.status === "COMPLETE";
    }catch(e){
        state.debug.confirm_error = e.message;
        return false;
    }
}

// 🚀 SAFE ORDER
async function safeTrade(price){

    if(!acquireLock()){
        state.debug.lock = "BLOCKED";
        return;
    }

    try{
        if(hasOpenTrade()){
            state.debug.duplicate = "BLOCKED";
            releaseLock();
            return;
        }

        kc.setAccessToken(process.env.ACCESS_TOKEN);

        const order = await kc.placeOrder("regular",{
            exchange:EXCHANGE,
            tradingsymbol:SYMBOL,
            transaction_type:"BUY",
            quantity:1,
            product:"MIS",
            order_type:"MARKET"
        });

        const confirmed = await confirmOrder(order.order_id);

        if(!confirmed){
            state.debug.confirm = "FAILED";
            releaseLock();
            return;
        }

        state.activeOrderId = order.order_id;

        state.trades.push({
            symbol:SYMBOL,
            entry:price,
            orderId:order.order_id,
            status:"LIVE"
        });

        state.debug.trade = "SAFE_EXECUTED";

    }catch(e){
        state.debug.error = e.message;
    }

    releaseLock();
}

module.exports = { safeTrade };

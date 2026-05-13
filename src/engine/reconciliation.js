
const { KiteConnect } = require("kiteconnect");
const state = require("../core/state");

const kc = new KiteConnect({
  api_key: process.env.API_KEY
});

function liveTradeMap(){
  const map = {};

  for(const t of state.trades){
    if(t.status === "LIVE"){
      map[t.symbol] = t;
    }
  }

  return map;
}

async function reconcilePositions(){

  try{

    kc.setAccessToken(process.env.ACCESS_TOKEN);

    const broker = await kc.getPositions();

    const botTrades = liveTradeMap();

    const net = broker.net || [];

    state.debug.reconciliation = [];

    for(const p of net){

      const symbol = p.tradingsymbol;
      const qty = p.quantity;

      const exists = botTrades[symbol];

      // BOT THINKS LIVE BUT BROKER CLOSED
      if(exists && qty === 0){

        exists.status = "CLOSED_AUTO";

        state.closedTrades.push(exists);

        state.trades = state.trades.filter(
          t => t.orderId !== exists.orderId
        );

        state.recovery.recovered++;

        state.debug.reconciliation.push({
          symbol,
          action:"AUTO_CLOSE_RECOVERY"
        });
      }

      // BROKER HAS POSITION BUT BOT LOST IT
      if(!exists && qty !== 0){

        state.trades.push({
          symbol,
          entry:p.average_price,
          quantity:qty,
          pnl:p.pnl,
          recovered:true,
          status:"LIVE"
        });

        state.recovery.recovered++;

        state.debug.reconciliation.push({
          symbol,
          action:"POSITION_RESTORED"
        });
      }

      // QTY MISMATCH
      if(exists && qty !== 0){

        if(exists.quantity && exists.quantity !== qty){

          exists.quantity = qty;

          state.recovery.mismatches++;

          state.debug.reconciliation.push({
            symbol,
            action:"QTY_FIXED",
            brokerQty:qty
          });
        }
      }

      state.recovery.reconciled++;
    }

  }catch(e){

    state.debug.reconcile_error = e.message;
  }
}

setInterval(async ()=>{
  await reconcilePositions();
},15000);

module.exports = { reconcilePositions };

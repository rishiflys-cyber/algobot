
const { KiteConnect } = require("kiteconnect");
const state = require("../core/state");

const kc = new KiteConnect({ api_key: process.env.API_KEY });

// 🔥 HARD FIX CAPITAL (no failure case)
async function updateCapital(){
    try{
        if(!state.accessToken){
            state.debug.capital = "NO_TOKEN";
            return;
        }

        kc.setAccessToken(state.accessToken);

        const m = await kc.getMargins();

        state.debug.rawMargins = m;

        let capital = 0;

        // robust parsing
        if(m.equity){
            if(m.equity.available){
                const a = m.equity.available;
                capital =
                    a.live_balance ??
                    a.opening_balance ??
                    a.cash ??
                    a.net ??
                    0;
            }

            if(capital === 0){
                capital = m.equity.net || 0;
            }
        }

        // FINAL fallback (never show 0 if data exists)
        if(capital === 0 && m){
            capital =
                m.equity?.available?.opening_balance ||
                m.equity?.available?.cash ||
                m.equity?.net ||
                0;
        }

        state.capital = capital;

        state.debug.capital = capital > 0 ? "OK" : "ZERO_WARNING";

    }catch(e){
        state.debug.capital_error = e.message;
    }
}

// loop
setInterval(updateCapital, 5000);

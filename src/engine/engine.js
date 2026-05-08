
const { KiteConnect } = require("kiteconnect");
const state = require("../core/state");

const kc = new KiteConnect({ api_key: process.env.API_KEY });

async function updateCapital(){
    try{
        if(!state.accessToken){
            state.debug.capital = "NO_TOKEN";
            return;
        }

        kc.setAccessToken(state.accessToken);

        const margins = await kc.getMargins();

        // FULL DEBUG
        state.debug.fullMargins = margins;

        let capital = 0;

        if(margins.equity && margins.equity.available){
            const a = margins.equity.available;

            capital =
                a.live_balance ||
                a.opening_balance ||
                a.cash ||
                a.net ||
                0;
        }

        // fallback (some accounts)
        if(capital === 0 && margins.equity){
            capital = margins.equity.net || 0;
        }

        state.capital = capital;
        state.debug.capital = "FINAL_UPDATED";

    }catch(e){
        state.debug.capital_error = e.message;
    }
}

setInterval(updateCapital, 5000);


module.exports = {
    capital: 0,
    trades: [],
    closedTrades: [],
    dailyPnL: 0,
    tokenLoaded: false,
    accessToken: "",
    ip: "",
    debug: {},
    stats: {
        tradesToday: 0,
        maxTrades: 2,
        maxDailyLoss: 0.03,
        paused: false
    }
};

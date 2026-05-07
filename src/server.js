
const app = require("./app");
const PORT = process.env.PORT || 3000;

process.on("unhandledRejection", (err) => {
  console.error("UNHANDLED:", err.message);
});

require("./engine/engine");

app.listen(PORT, () => console.log("REAL ENGINE FIX LIVE", PORT));

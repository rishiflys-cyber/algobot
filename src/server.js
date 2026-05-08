
const app = require("./app");
const PORT = process.env.PORT || 3000;

process.on("unhandledRejection", (err) => {
  console.error("UNHANDLED:", err);
});

require("./engine/engine");

app.listen(PORT, () => console.log("FIXED ENGINE LIVE", PORT));

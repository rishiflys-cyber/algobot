
const app = require("./app");
const PORT = process.env.PORT || 3000;

require("./engine/engine");

app.listen(PORT, () => console.log("TOKEN FIX V3 RUNNING", PORT));

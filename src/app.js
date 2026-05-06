
const express = require("express");
const app = express();

app.use("/", require("./routes/login"));
app.use("/", require("./routes/performance"));

module.exports = app;

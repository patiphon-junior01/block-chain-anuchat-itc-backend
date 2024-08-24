const express = require("express");
const app = express();
const port = 3000;
const loginRouter = require("./login");
const registerRouter = require("./register");
const logoutRouter = require("./logout");
const walletRouter = require("./wallet");

app.use(express.json());
app.use("/api/login", loginRouter);
app.use("/api/register", registerRouter);
app.use("/api/logout", logoutRouter);
app.use("/api/wallet", walletRouter);

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});

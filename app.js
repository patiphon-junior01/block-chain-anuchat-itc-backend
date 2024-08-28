const express = require("express");
const app = express();
const router = express.Router();
const port = 3005;

const loginRouter = require("./controller/auth/login");
const registerRouter = require("./controller/auth/register");

const walletRouter = require("./controller/wallet/wallet");
const authenticateUser = require("./middleware/handle");

app.use(express.json());

app.use("/api/login", loginRouter);
app.use("/api/register", registerRouter);
app.use("/api/wallet", authenticateUser, walletRouter);

app.get("/api/test-api/test", (req, res) => {
  return res.status(200).json({ message: "Test successful", data: [] });
});

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});

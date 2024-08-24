const express = require("express");
const router = express.Router();
const { ethers } = require("ethers");
const db = require("./lib/db");

// Connect to Ethereum testnet (e.g., Goerli)
const provider = new ethers.providers.JsonRpcProvider(
  "https://goerli.infura.io/v3/YOUR_INFURA_PROJECT_ID"
);

// Middleware to check if user is authenticated
const authenticateUser = (req, res, next) => {
  // Implement JWT verification here
  // For simplicity, we'll assume the user is authenticated and their ID is in req.userId
  next();
};

router.post("/generate", authenticateUser, async (req, res) => {
  try {
    const wallet = ethers.Wallet.createRandom();
    await db.query(
      "UPDATE users SET eth_address = $1, eth_private_key = $2 WHERE id = $3",
      [wallet.address, wallet.privateKey, req.userId]
    );
    res.json({ address: wallet.address });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error generating wallet" });
  }
});

router.get("/balance", authenticateUser, async (req, res) => {
  try {
    const result = await db.query(
      "SELECT eth_address FROM users WHERE id = $1",
      [req.userId]
    );
    const address = result.rows[0].eth_address;
    const balance = await provider.getBalance(address);
    res.json({ balance: ethers.utils.formatEther(balance) });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error fetching balance" });
  }
});

router.post("/transfer", authenticateUser, async (req, res) => {
  try {
    const { to, amount } = req.body;
    const result = await db.query(
      "SELECT eth_private_key FROM users WHERE id = $1",
      [req.userId]
    );
    const privateKey = result.rows[0].eth_private_key;

    const wallet = new ethers.Wallet(privateKey, provider);
    const tx = await wallet.sendTransaction({
      to: to,
      value: ethers.utils.parseEther(amount),
    });

    await tx.wait();
    res.json({ message: "Transfer successful", txHash: tx.hash });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error transferring funds" });
  }
});

module.exports = router;

const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const db = require("./lib/db");
const { ethers } = require("ethers");

router.post("/", async (req, res) => {
  try {
    const { username, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create Ethereum wallet
    const wallet = ethers.Wallet.createRandom();

    const result = await db.query(
      "INSERT INTO users (username, password, eth_address, eth_private_key) VALUES ($1, $2, $3, $4) RETURNING id",
      [username, hashedPassword, wallet.address, wallet.privateKey]
    );

    res.status(201).json({
      message: "User registered successfully",
      userId: result.rows[0].id,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error registering user" });
  }
});

module.exports = router;

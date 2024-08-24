const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const db = require("./lib/db");
const { ethers } = require("ethers");
require('dotenv').config();

// Connect to Ethereum testnet (e.g., Goerli)
// "https://sepolia.infura.io/v3/5e8d1c6e92094ef3bf5524fd4a0a036a"
const provider = new ethers.JsonRpcProvider(
  "https://linea-sepolia.infura.io/v3/5e8d1c6e92094ef3bf5524fd4a0a036a"
);

// ฟังก์ชันในการเติม Ether ไปยังที่อยู่ใหม่
async function fundWallet(walletAddress, amountInEther) {
  try {
    // สร้าง wallet สำหรับการส่ง Ether
    const senderWallet = new ethers.Wallet('0x2b414c1c0705e0ed2b23c2e11a2032d7ea05637c0d06e3ce88ca5043fb803a56', provider);

    // สร้างธุรกรรมการส่ง Ether
    const tx = {
      to: walletAddress,
      value: ethers.parseEther(amountInEther),
    };

    // ส่ง Ether
    const txResponse = await senderWallet.sendTransaction(tx);
    await txResponse.wait();
    console.log('Funded wallet with Ether:', amountInEther);
  } catch (error) {
    console.error('Error funding wallet:', error);
  }
}

router.post("/", async (req, res) => {
  try {
    const { username, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);

    // สร้าง Ethereum wallet ใหม่
    const wallet = ethers.Wallet.createRandom();

    // บันทึกข้อมูลผู้ใช้ลงในฐานข้อมูล
    const result = await db.query(
      "INSERT INTO users (username, password, eth_address, eth_private_key) VALUES ($1, $2, $3, $4) RETURNING id",
      [username, hashedPassword, wallet.address, wallet.privateKey]
    );

    // เติม Ether ไปยังที่อยู่ของ wallet ใหม่
    const amountInEther = '0.001'; // จำนวน Ether ที่ต้องการเติม
    await fundWallet(wallet.address, amountInEther);

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

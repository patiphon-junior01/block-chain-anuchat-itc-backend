const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const db = require("../../lib/db");
const { ethers } = require("ethers");
require('dotenv').config();

// Connect to Ethereum testnet (e.g., Goerli)
// "https://sepolia.infura.io/v3/5e8d1c6e92094ef3bf5524fd4a0a036a"
const provider = new ethers.JsonRpcProvider(
  "https://linea-sepolia.infura.io/v3/5e8d1c6e92094ef3bf5524fd4a0a036a"
);

// ฟังก์ชันในการเติม Ether ไปยังที่อยู่ใหม่ บัญชีเเรก
async function fundWallet(walletAddress, amountInEther) {
  try {
    // สร้าง wallet สำหรับการส่ง Ether
    const senderWallet = new ethers.Wallet(process.env.PRIVATE_KEY_MAIN_ACCOUNT, provider);

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
    const { username, password, firstname, lastname } = req.body;

    if (!username || !password || !firstname || !lastname) {
      return res.status(400).json({ message: "Missing required fields" });
    }
    // validate data

    const resultCheckUser = await db.query("SELECT * FROM users WHERE username = $1", [
      username,
    ]);

    if (resultCheckUser.rows.length > 0) {
      return res.status(400).json({ message: "Username Already Exist" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // บันทึกข้อมูลผู้ใช้ลงในฐานข้อมูล
    const result = await db.query(
      "INSERT INTO users (username, password, firstname, lastname) VALUES ($1, $2, $3, $4) RETURNING id",
      [username, hashedPassword, firstname, lastname]
    );

    // เติม Ether ไปยังที่อยู่ของ wallet ใหม่
    // const amountInEther = '0.005'; // จำนวน Ether ที่ต้องการเติม สำหรับ gas ในการ โอน
    // await fundWallet(wallet.address, amountInEther);
    res.status(201).json({
      message: "User registered successfully",
      data: {
        userId: result.rows[0].id,
        username: username,
        firstname: firstname,
        lastname: lastname
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error registering user" });
  }
});

module.exports = router;

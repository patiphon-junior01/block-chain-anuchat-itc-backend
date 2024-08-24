const express = require("express");
const router = express.Router();
// const { ethers, BigNumber } = require('ethers');
const ethers = require('ethers');
const db = require("./lib/db");
const jwt = require("jsonwebtoken");
require('dotenv').config();

// Connect to Ethereum testnet (e.g., Goerli)
// "https://sepolia.infura.io/v3/5e8d1c6e92094ef3bf5524fd4a0a036a"
const provider = new ethers.JsonRpcProvider(
  "https://linea-sepolia.infura.io/v3/5e8d1c6e92094ef3bf5524fd4a0a036a"
);

// Middleware to check if user is authenticated

const SECRET_KEY = process.env.JWT_SECRET;
const authenticateUser = (req, res, next) => {
  // ดึง Token จาก Header Authorization
  const authHeader = req.headers.authorization;
  // ตรวจสอบว่า Authorization header มีค่าและเริ่มต้นด้วย 'Bearer '
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    // ตรวจสอบ Token ด้วย secret key
    jwt.verify(token, SECRET_KEY, (err, user) => {
      if (err) {
        // ถ้า Token ไม่ถูกต้องหรือหมดอายุ
        return res.status(403).json({ message: 'Forbidden' });
      }
      req.user = user;
      next();
    });
  } else {
    // ถ้าไม่มี Token ใน Header
    res.status(401).json({ message: 'Unauthorized' });
  }
};

module.exports = authenticateUser;

const tokenABI = [
  // ERC-20 ABI
  "function balanceOf(address) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function transfer(address to, uint256 amount) returns (bool)"
];
const tokenABITranfer = [
  "function balanceOf(address) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function transfer(address to, uint256 amount) returns (bool)"
];
const tokenAddress = "0xcf7ffc6466898afd883f9b44e6cf5dd95994e3b2";


router.post("/generate", authenticateUser, async (req, res) => {
  res.status(500).json({ message: "Not Allow" });
  return;
  // ไม่ต้องสร้างใหม่
  try {
    const { userId } = req.body;
    const wallet = ethers.Wallet.createRandom();
    const update = await db.query(
      "UPDATE users SET eth_address = $1, eth_private_key = $2 WHERE id = $3",
      [wallet.address, wallet.privateKey, userId]
    );
    if (update) {
      res.json({ address: wallet.address });
    } else {
      res.status(500).json({ message: "Error generating wallet" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error generating wallet" });
  }
});


router.get("/balance", authenticateUser, async (req, res) => {
  try {
    const data = req.query
    const result = await db.query(
      "SELECT eth_address FROM users WHERE id = $1",
      [data.userId]
    );
    if (result?.rows.length > 0) {
      const address = result.rows[0].eth_address;
      console.log("Ethereum Address:", address);

      // การดึงยอดคงเหลือโทเค็น ERC-20
      const tokenContract = new ethers.Contract(tokenAddress, tokenABI, provider);
      const balance = await tokenContract.balanceOf(address);
      const tokenDecimals = await tokenContract.decimals();
      res.json({ balance: ethers.formatUnits(balance, tokenDecimals) });
    } else {
      res.status(500).json({ message: "Error fetching balance" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error fetching balance" });
  }
});


router.post("/transfer", authenticateUser, async (req, res) => {
  try {
    const { to, amount } = req.body;
    const { userId } = req.user;

    // ตรวจสอบจำนวนเงิน
    if (isNaN(amount) || amount <= 0) {
      return res.status(400).json({ message: "Invalid amount" });
    }

    // ดึง Private Key จากฐานข้อมูล
    const { rows } = await db.query(
      "SELECT eth_private_key FROM users WHERE id = $1",
      [userId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: "Account not found" });
    }

    const privateKey = rows[0].eth_private_key;
    const wallet = new ethers.Wallet(privateKey, provider);

    // สร้าง instance ของสัญญาโทเค็น
    const tokenABI = [
      "function balanceOf(address) view returns (uint256)",
      "function decimals() view returns (uint8)",
      "function transfer(address to, uint256 amount) returns (bool)"
    ];
    const tokenContract = new ethers.Contract(tokenAddress, tokenABI, wallet);

    // ดึงจำนวน decimals ของโทเค็น
    const decimals = await tokenContract.decimals();

    // แปลงจำนวนเงินให้เป็นหน่วยย่อย
    const amountInUnits = ethers.parseUnits(amount.toString(), decimals);
    const balance = await tokenContract.balanceOf(wallet.address);

    console.log(`amountInUnits: ${amountInUnits}`);
    console.log(`balance: ${balance}`);

    // แปลงเป็น Ether format
    console.log(`ETH balance: ${ethers.formatEther(balance)}`);
    console.log(`ETH amountInUnits: ${ethers.formatEther(amountInUnits)}`);

    // ตรวจสอบว่าบัญชีมียอดเพียงพอสำหรับการโอนหรือไม่
    if (BigInt(balance) < amountInUnits) {
      return res.status(400).json({ message: "Insufficient balance" });
    }

    // ประมาณการ Gas Limit โดยใช้การเรียก estimateGas
    const estimatedGasLimit = await tokenContract.transfer.estimateGas(to, amountInUnits);

    // เพิ่มค่า gas limit ประมาณ 10% สำหรับความปลอดภัย
    const gasLimit = estimatedGasLimit;

    // ตั้งค่า Gas Price
    const gasPrice = ethers.parseUnits("100", "gwei"); // กำหนด Gas price เป็น 1 Gwei

    console.log("Gas Limit:", gasLimit.toString());
    console.log("Gas Price:", gasPrice.toString());

    // ดำเนินการโอน
    const txResponse = await tokenContract.transfer(to, amountInUnits, {
      gasLimit: gasLimit,
      gasPrice: gasPrice,
    });
    await txResponse.wait();

    // ส่งข้อมูลการทำธุรกรรมกลับไปให้กับ client
    res.json({ message: "Transfer successful", txHash: txResponse.hash });
  } catch (error) {
    console.error("Error transferring tokens:", error);
    res.status(500).json({ message: "Error transferring tokens" });
  }
});


module.exports = router;

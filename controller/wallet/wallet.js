const express = require("express");
const router = express.Router();
// const { ethers, BigNumber } = require('ethers');
const ethers = require('ethers');
const db = require("./../../lib/db");
const jwt = require("jsonwebtoken");
require('dotenv').config();
const { fundWallet } = require("./../../utils/generate_gas")
const { getBalanceITC, getBalanceGas } = require("./../../utils/global")



// Connect to Ethereum testnet (e.g., Goerli)
// "https://sepolia.infura.io/v3/5e8d1c6e92094ef3bf5524fd4a0a036a"
const provider = new ethers.JsonRpcProvider(
  process.env.PROVIDER_URL
);


// ERC-20 ABI
const tokenABI = [
  "function balanceOf(address) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function transfer(address to, uint256 amount) returns (bool)"
];

const tokenAddress = process.env.TOKEN_ADDRESS;
const tokenAddressEth = process.env.TOKEN_ADDRESS_ETH;


router.get("/validate", async (req, res) => {
  res.status(200).json({ message: "Pass To Dashboard" });
});

router.get("/count-account", async (req, res) => {
  try {
    const { userId } = req.user;
    const result = await db.query(
      "SELECT count(*) as count FROM wallet WHERE id_user = $1 group by id_user",
      [userId]
    );

    if (result?.rows.length > 0) {
      const count = result.rows[0].count;
      res.json({ count: count ?? 0, message: "Account detected" });
    } else {
      res.status(404).json({ message: "Account is Empty", count: 0 });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error fetching balance" });
  }
});

router.post("/create-wallet", async (req, res) => {
  try {
    const { nameWallet } = req.body;
    const { userId } = req.user;

    if (!nameWallet) {
      return res.status(400).json({ message: "nameWallet Required Field" });
    }

    const result = await db.query(
      "SELECT * FROM users WHERE id = $1",
      [userId]
    );

    if (result?.rows.length > 0) {
      const wallet = ethers.Wallet.createRandom();

      const resultCount = await db.query(
        "SELECT count(*) as count FROM wallet WHERE id_user = $1 group by id_user",
        [userId]
      );

      if (resultCount?.rows.length > 0) {
        const count = resultCount.rows[0].count;
        if (count >= 5) { // max account 5
          return res.status(403).json({ message: "Not Allow Create Wallet, Max is 5 Wallet" });
        }
      }

      const result = await db.query(
        "INSERT INTO wallet (id_user, name_wallet, eth_address, eth_private_key) VALUES ($1, $2, $3, $4) RETURNING id",
        [userId, nameWallet, wallet.address, wallet.privateKey]
      );

      // เติม Ether ไปยังที่อยู่ของ wallet ใหม่
      const amountInEther = '0.002'; // จำนวน Ether ที่เติมสำหรับการเปิดบัญชีใหม่
      await fundWallet(wallet.address, amountInEther);
      res.status(201).json({
        message: "Wallet create successfully",
        data: {
          nameWallet,
          userId: result.rows[0].id,
          address: wallet.address,
          privateKey: wallet.privateKey
        }
      });
    } else {
      res.status(404).json({ message: "Account is Empty" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error Create Wallet" });
  }
});

router.get("/infomation-account", async (req, res) => {
  try {
    const { userId } = req.user;

    // Fetch user information
    const userResult = await db.query(
      "SELECT username, firstname, lastname FROM users WHERE id = $1",
      [userId]
    );

    if (userResult?.rows.length > 0) {
      // Fetch wallet data
      const walletResult = await db.query(
        "SELECT * FROM wallet WHERE id_user = $1",
        [userId]
      );

      const walletData = walletResult.rows;

      // Process wallet data asynchronously
      const balancePromises = walletData.map(async (row) => {
        const Gas = await getBalanceGas(row?.eth_address);
        const ITC = await getBalanceITC(row?.eth_address);

        return {
          address: row?.eth_address,
          Gas: parseFloat(Gas?.balance || 0),
          ITC: parseFloat(ITC?.balance || 0),
        };
      });

      // Wait for all balance promises to resolve
      const balances = await Promise.all(balancePromises);

      // Aggregate balances
      const TokenEth = balances.reduce((total, balance) => total + balance.Gas, 0);
      const TokenITC = balances.reduce((total, balance) => total + balance.ITC, 0);

      // Prepare response data
      const userData = userResult.rows[0];
      res.json({
        data: { ...userData, nameToken: "ITCMCOIN", symbol: "(ITC)" },
        balance: { TokenEth, TokenITC },
      });
    } else {
      res.status(404).json({ message: "Account is Empty", count: 0 });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error fetching data" });
  }
});

router.get("/my-wallet", async (req, res) => {
  try {
    const { userId } = req.user;

    // Fetch user information
    const userResult = await db.query(
      "SELECT username, firstname, lastname FROM users WHERE id = $1",
      [userId]
    );

    if (userResult?.rows.length > 0) {
      // Fetch wallet data
      const walletResult = await db.query(
        "SELECT * FROM wallet WHERE id_user = $1",
        [userId]
      );

      const walletData = walletResult.rows;

      const balancePromises = walletData.map(async (row) => {
        const Gas = await getBalanceGas(row?.eth_address);
        const ITC = await getBalanceITC(row?.eth_address);

        return {
          id_wallet: row?.id,
          address: row?.eth_address,
          name_wallet: row?.name_wallet,
          Gas: parseFloat(Gas?.balance || 0),
          ITC: parseFloat(ITC?.balance || 0),
        };
      });

      const balances_wallet = await Promise.all(balancePromises);

      const userData = userResult.rows[0];
      res.json({
        user_data: { ...userData },
        wallet: balances_wallet,
      });
    } else {
      res.status(404).json({ message: "Account is Empty", count: 0 });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error fetching data" });
  }
});

router.post("/transfer", async (req, res) => {
  try {
    const { to, amount, id_wallet } = req.body;
    const { userId } = req.user;

    if (!to || !id_wallet) {
      return res.status(400).json({ message: "Invalid to & id_wallet this field is required" });
    }

    // ตรวจสอบจำนวนเงิน
    if (isNaN(amount) || amount <= 0) {
      return res.status(400).json({ message: "Invalid amount" });
    }
    // ดึง Private Key จากฐานข้อมูล
    const { rows } = await db.query(
      "SELECT eth_private_key FROM wallet WHERE id = $1 AND id_user = $2",
      [id_wallet, userId]
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
    res.status(500).json({ message: "Error transferring tokens, Because You Gas Not enough or server error" });
  }
});

router.get("/balance", async (req, res) => {
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

router.get("/balance_eth", async (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId) {
      return res.status(400).json({ message: "User ID is required" });
    }

    // Fetch user data from the database
    const result = await db.query(
      "SELECT * FROM users WHERE id = $1",
      [userId]
    );

    if (result?.rows.length > 0) {
      const balance = await provider.getBalance("youre Address");
      const balanceInEther = ethers.formatEther(balance); // Convert balance from wei to ether
      res.json({ balance: balanceInEther });
    } else {
      res.status(404).json({ message: "User not found" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error fetching balance" });
  }
});


module.exports = router;

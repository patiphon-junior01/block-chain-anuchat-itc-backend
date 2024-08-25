const { ethers } = require("ethers");
require('dotenv').config();

const provider = new ethers.JsonRpcProvider(
  process.env.PROVIDER_URL
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
    return true;
  } catch (error) {
    console.error('Error funding wallet:', error);
    return false;
  }
}


module.exports = { fundWallet };
const { ethers } = require("ethers");
require('dotenv').config();

const provider = new ethers.JsonRpcProvider(
  process.env.PROVIDER_URL
);

const tokenAddress = process.env.TOKEN_ADDRESS;
// ERC-20 ABI
const tokenABI = [
  "function balanceOf(address) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function transfer(address to, uint256 amount) returns (bool)"
];

async function getBalanceITC(address) {
  try {
    const tokenContract = new ethers.Contract(tokenAddress, tokenABI, provider);
    const balance = await tokenContract.balanceOf(address);
    const tokenDecimals = await tokenContract.decimals();
    return { balance: ethers.formatUnits(balance, tokenDecimals) };
  } catch (error) {
    console.error('Error funding wallet:', error);
    return { balance: 0 };
  }
}

async function getBalanceGas(address) {
  try {
    const balance = await provider.getBalance(address);
    const balanceInEther = ethers.formatEther(balance); // Convert balance from wei to ether
    return { balance: balanceInEther };
  } catch (error) {
    console.error('Error funding wallet:', error);
    return { balance: 0 };
  }
}

module.exports = { getBalanceITC, getBalanceGas };
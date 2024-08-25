const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
require('dotenv').config();


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
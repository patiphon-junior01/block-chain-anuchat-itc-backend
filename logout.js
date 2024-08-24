const express = require("express");
const router = express.Router();

router.post("/", (req, res) => {
  // In a real-world scenario, you might want to invalidate the token on the server-side
  // For simplicity, we'll just send a success message
  res.json({ message: "Logout successful" });
});

module.exports = router;

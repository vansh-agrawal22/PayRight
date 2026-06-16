const express = require("express");
const router = express.Router();

const { signUp,login,addBankDetails,searchUser,sendMoney, History, CheckBalance, generateQR, qrpay} = require("../controllers/authController");
const {jwtAuthMiddleware} = require("../jwt");  


router.post("/signup", signUp);
router.post("/login", login);
router.post("/add-bank", jwtAuthMiddleware, addBankDetails);
router.get("/search-user", jwtAuthMiddleware, searchUser);
router.post("/send-money", jwtAuthMiddleware, sendMoney);
router.get("/history", jwtAuthMiddleware, History);
router.get("/check-balance", jwtAuthMiddleware, CheckBalance);
router.get("/generate-qr", jwtAuthMiddleware, generateQR);
router.post("/qr-pay", jwtAuthMiddleware, qrpay);


module.exports = router;
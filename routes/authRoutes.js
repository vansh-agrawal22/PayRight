const express = require("express");
const router = express.Router();

const { signUp,login,addBankDetails,searchUser,sendMoney, History, CheckBalance, generateQR, qrpay,logout, editProfile, changePassword, editBankDetails, getProfile, getReceipt} = require("../controllers/authController");
const {jwtAuthMiddleware} = require("../jwt");  


router.post("/signup", signUp);
router.post("/login", login);
router.post("/add-bank", jwtAuthMiddleware, addBankDetails);
router.post("/qr-pay", jwtAuthMiddleware, qrpay);
router.post("/logout", jwtAuthMiddleware, logout);
router.post("/send-money", jwtAuthMiddleware, sendMoney);
router.get("/profile", jwtAuthMiddleware, getProfile);
router.get("/search-user", jwtAuthMiddleware, searchUser);
router.get("/receipt/:transactionId", jwtAuthMiddleware, getReceipt);
router.get("/history", jwtAuthMiddleware, History);
router.get("/check-balance", jwtAuthMiddleware, CheckBalance);
router.get("/generate-qr", jwtAuthMiddleware, generateQR);
router.put("/edit-profile", jwtAuthMiddleware, editProfile);
router.put("/change-password", jwtAuthMiddleware, changePassword);
router.put("/edit-bank", jwtAuthMiddleware, editBankDetails);


module.exports = router;
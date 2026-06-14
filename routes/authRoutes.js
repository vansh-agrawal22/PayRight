const express = require("express");
const router = express.Router();

const { signUp,login,addBankDetails,searchUser} = require("../controllers/authController");
const {jwtAuthMiddleware} = require("../jwt");  


router.post("/signup", signUp);
router.post("/login", login);
router.post("/add-bank", jwtAuthMiddleware, addBankDetails);
router.get("/search-user", jwtAuthMiddleware, searchUser);

module.exports = router;
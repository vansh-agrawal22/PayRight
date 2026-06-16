const User = require("../models/userModel");
const Transaction = require("../models/transactionModel");
const bcrypt = require("bcrypt");
const { generateJWT } = require("../jwt");

const QRCode = require("qrcode");
const path = require("path");

const signUp = async (req, res) => {

    try {

        const {
            firstName,
            lastName,
            phoneNumber,
            email,
            password
        } = req.body;

        const hashedPassword = await bcrypt.hash(password, 10);

        const user = await User.create({
            firstName,
            lastName,
            phoneNumber,
            email,
            password: hashedPassword
        });

        res.status(201).json({
            message: "Account Created Successfully",
            data: user
        });

    } catch (error) {

        res.status(500).json({
            message: error.message
        });

    }
};

const login = async (req, res) => {

    try {

        const { email, password } = req.body;

        const user = await User.findOne({ email });

        if (!user) {
            return res.status(404).json({
                message: "User not found"
            });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        

        if (!isMatch) {
            return res.status(400).json({
                message: "Invalid Password"
            });
        }

        const token = generateJWT({
        id: user._id

        });

        res.status(200).json({
            message:"Login Successful",
            token: token
        });

    } catch (error) {

        res.status(500).json({
            message: error.message
        });

    }
};

const addBankDetails = async (req, res) => {

    try {

        const {
            bankName,
            accountHolderName,
            accountNumber,
            ifscCode,
            address,
            pincode
        } = req.body;

        const user = await User.findById(req.user.id);

        if (!user) {
            return res.status(404).json({
                message: "User not found"
            });
        }

        user.bankName = bankName;
        user.accountHolderName = accountHolderName;
        user.accountNumber = accountNumber;
        user.ifscCode = ifscCode;
        user.address = address;
        user.pincode = pincode;

        // Give ₹10,000 virtual balance
       if(user.accountBalance === 0){
       user.accountBalance = 10000;
       }

        await user.save();

        res.status(200).json({
            message: "Bank details added successfully",
            balance: user.accountBalance,
            data: user
        });

    } catch (error) {

        res.status(500).json({
            message: error.message
        });

    }

};

const searchUser = async (req, res) => {

    try {

        const query = req.query.query;

        const users = await User.find({
            $or: [
                { firstName: { $regex: query, $options: "i" } },
                { phoneNumber: { $regex: query, $options: "i" } }
            ]
        }).select("firstName lastName phoneNumber email");

        res.status(200).json(users);

    } catch (error) {

        res.status(500).json({
            message: error.message
        });

    }

};

const sendMoney = async (req, res) => {

    try {

        const { receiverId, amount } = req.body;

        const sender = await User.findById(req.user.id);

        const receiver = await User.findById(receiverId);

        if (!receiver) {
            return res.status(404).json({
                message: "Receiver not found"
            });
        }

        if (sender._id.toString() === receiver._id.toString()) {
            return res.status(400).json({
                message: "Cannot send money to yourself"
            });
        }

        if (amount <= 0) {
            return res.status(400).json({
                message: "Amount must be greater than zero"
            });
        }

        if (sender.accountBalance < amount) {
            return res.status(400).json({
                message: "Insufficient balance"
            });
        }

        sender.accountBalance -= amount;

        receiver.accountBalance += amount;

        await sender.save();

        await receiver.save();

        const transaction = await Transaction.create({
            senderId: sender._id,
            receiverId: receiver._id,
            amount
        });

        res.status(200).json({
            message: "Payment Successful",
            transaction
        });

    } catch (error) {

        res.status(500).json({
            message: error.message
        });

    }

};

const History = async (req, res) => {

    try {

        const transactions = await Transaction.find({
            $or: [
                { senderId: req.user.id },
                { receiverId: req.user.id }
            ]
        })
        .populate("senderId", "firstName lastName phoneNumber")
        .populate("receiverId", "firstName lastName phoneNumber")
        .sort({ createdAt: -1 });

        res.status(200).json({
            message: "Transaction History",
            data: transactions
        });

    } catch (error) {

        res.status(500).json({
            message: error.message
        });

    }

};

const CheckBalance = async (req, res) => {

    try {

        const user = await User.findById(req.user.id);

        if (!user) {
            return res.status(404).json({
                message: "User not found"
            });
        }

        res.status(200).json({
            message: "Balance fetched successfully",
            accountBalance: user.accountBalance
        });

    } catch (error) {

        res.status(500).json({
            message: error.message
        });

    }

};

const generateQR = async (req, res) => {

    try {

        const user = await User.findById(req.user.id);

        if (!user) {
            return res.status(404).json({
                message: "User not found"
            });
        }

        const qrData = JSON.stringify({
            userId: user._id,
            name: user.firstName + " " + user.lastName,
            phoneNumber: user.phoneNumber
        });

        const fileName = `${user._id}.png`;

        const filePath = path.join(__dirname, "../uploads/qr", fileName);

        await QRCode.toFile(filePath, qrData);

        res.status(200).json({
            message: "QR Generated Successfully",
            qrUrl: `http://localhost:8080/uploads/qr/${fileName}`
        });

    } catch (error) {

        res.status(500).json({
            message: error.message
        });

    }

};

const qrpay = async (req, res) => {

    try {

        const { userId, amount } = req.body;

        const sender = await User.findById(req.user.id);

        const receiver = await User.findById(userId);

        if (!receiver) {
            return res.status(404).json({
                message: "Receiver not found"
            });
        }

        if (sender._id.toString() === receiver._id.toString()) {
            return res.status(400).json({
                message: "You cannot pay yourself"
            });
        }

        if (amount <= 0) {
            return res.status(400).json({
                message: "Amount must be greater than zero"
            });
        }

        if (sender.accountBalance < amount) {
            return res.status(400).json({
                message: "Insufficient Balance"
            });
        }

        sender.accountBalance -= amount;
        receiver.accountBalance += amount;

        await sender.save();
        await receiver.save();

        const transaction = await Transaction.create({
            senderId: sender._id,
            receiverId: receiver._id,
            amount: amount
        });

        res.status(200).json({
            message: "QR Payment Successful",
            transaction
        });

    } catch (error) {

        res.status(500).json({
            message: error.message
        });

    }

};

module.exports = { signUp, login , addBankDetails, searchUser, sendMoney, History, CheckBalance, generateQR, qrpay};
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

        // Check required fields
        if (!firstName || !lastName || !phoneNumber || !email || !password) {
            return res.status(400).json({
                success: false,
                message: "All fields are required"
            });
        }

        // Check if email already exists
        const existingEmail = await User.findOne({ email });

        if (existingEmail) {
            return res.status(409).json({
                success: false,
                message: "Email already registered"
            });
        }

        // Check if phone number already exists
        const existingPhone = await User.findOne({ phoneNumber });

        if (existingPhone) {
            return res.status(409).json({
                success: false,
                message: "Phone number already registered"
            });
        }

        // Password length validation
        if (password.length < 6) {
            return res.status(400).json({
                success: false,
                message: "Password must be at least 6 characters long"
            });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create user
        const user = await User.create({
            firstName,
            lastName,
            phoneNumber,
            email,
            password: hashedPassword
        });

        // Remove password before sending response
        const userResponse = user.toObject();
        delete userResponse.password;

        return res.status(201).json({
            success: true,
            message: "Account created successfully",
            data: userResponse
        });

    } catch (error) {

        console.error("Signup Error:", error);

        return res.status(500).json({
            success: false,
            message: "Internal Server Error"
        });

    }
};

const login = async (req, res) => {

    try {

        const { email, password } = req.body;

        // Check required fields
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: "Email and password are required"
            });
        }

        // Find user
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        // Compare password
        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            return res.status(401).json({
                success: false,
                message: "Invalid password"
            });
        }

        // Generate JWT
        const token = generateJWT({
            id: user._id
        });

        // Send response
        return res.status(200).json({
            success: true,
            message: "Login successful",
            token,
            user: {
                id: user._id,
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                phoneNumber: user.phoneNumber
            }
        });

    } catch (error) {

        console.error("Login Error:", error);

        return res.status(500).json({
            success: false,
            message: "Internal Server Error"
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

        // Check required fields
        if (
            !bankName ||
            !accountHolderName ||
            !accountNumber ||
            !ifscCode ||
            !address ||
            !pincode
        ) {
            return res.status(400).json({
                success: false,
                message: "All bank details are required"
            });
        }

        // Find user
        const user = await User.findById(req.user.id);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        // Check if bank details already exist
        if (user.accountNumber) {
            return res.status(400).json({
                success: false,
                message: "Bank details already added. Use Edit Bank Details API."
            });
        }

        // Check if account number already exists
        const accountExists = await User.findOne({
            accountNumber
        });

        if (accountExists) {
            return res.status(409).json({
                success: false,
                message: "Account number already exists"
            });
        }

        // IFSC validation (basic)
        if (ifscCode.length !== 11) {
            return res.status(400).json({
                success: false,
                message: "Invalid IFSC Code"
            });
        }

        // Pincode validation
        if (String(pincode).length !== 6) {
            return res.status(400).json({
                success: false,
                message: "Invalid pincode"
            });
        }

        // Save bank details
        user.bankName = bankName;
        user.accountHolderName = accountHolderName;
        user.accountNumber = accountNumber;
        user.ifscCode = ifscCode;
        user.address = address;
        user.pincode = pincode;

        // Give welcome balance only once
        if (user.accountBalance === 0) {
            user.accountBalance = 10000;
        }

        await user.save();

        return res.status(200).json({
            success: true,
            message: "Bank details added successfully",
            balance: user.accountBalance,
            data: {
                bankName: user.bankName,
                accountHolderName: user.accountHolderName,
                accountNumber: user.accountNumber,
                ifscCode: user.ifscCode,
                address: user.address,
                pincode: user.pincode
            }
        });

    } catch (error) {

        console.error("Add Bank Details Error:", error);

        return res.status(500).json({
            success: false,
            message: "Internal Server Error"
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

        // Check required fields
        if (!receiverId || amount == null) {
            return res.status(400).json({
                success: false,
                message: "Receiver ID and amount are required"
            });
        }

        // Validate amount
        if (isNaN(amount)) {
            return res.status(400).json({
                success: false,
                message: "Invalid amount"
            });
        }

        if (amount <= 0) {
            return res.status(400).json({
                success: false,
                message: "Amount must be greater than zero"
            });
        }

        // Find sender
        const sender = await User.findById(req.user.id);

        if (!sender) {
            return res.status(404).json({
                success: false,
                message: "Sender not found"
            });
        }

        // Find receiver
        const receiver = await User.findById(receiverId);

        if (!receiver) {
            return res.status(404).json({
                success: false,
                message: "Receiver not found"
            });
        }

        // Prevent self payment
        if (sender._id.toString() === receiver._id.toString()) {
            return res.status(400).json({
                success: false,
                message: "You cannot send money to yourself"
            });
        }

        // Sender bank details check
        if (!sender.accountNumber) {
            return res.status(400).json({
                success: false,
                message: "Please add your bank details first"
            });
        }

        // Receiver bank details check
        if (!receiver.accountNumber) {
            return res.status(400).json({
                success: false,
                message: "Receiver has not added bank details"
            });
        }

        // Check balance
        if (sender.accountBalance < amount) {
            return res.status(400).json({
                success: false,
                message: "Insufficient balance"
            });
        }

        // Update balances
        sender.accountBalance -= amount;
        receiver.accountBalance += amount;

        await sender.save();
        await receiver.save();

        // Create transaction
        const transaction = await Transaction.create({
            senderId: sender._id,
            receiverId: receiver._id,
            amount
        });

        return res.status(200).json({
            success: true,
            message: "Payment successful",
            transaction
        });

    } catch (error) {

        console.error("Send Money Error:", error);

        return res.status(500).json({
            success: false,
            message: "Internal Server Error"
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

        // Check required fields
        if (!userId || amount == null) {
            return res.status(400).json({
                success: false,
                message: "User ID and amount are required"
            });
        }

        // Validate amount
        if (isNaN(amount)) {
            return res.status(400).json({
                success: false,
                message: "Invalid amount"
            });
        }

        if (amount <= 0) {
            return res.status(400).json({
                success: false,
                message: "Amount must be greater than zero"
            });
        }

        // Find sender
        const sender = await User.findById(req.user.id);

        if (!sender) {
            return res.status(404).json({
                success: false,
                message: "Sender not found"
            });
        }

        // Find receiver
        const receiver = await User.findById(userId);

        if (!receiver) {
            return res.status(404).json({
                success: false,
                message: "Receiver not found"
            });
        }

        // Prevent self payment
        if (sender._id.toString() === receiver._id.toString()) {
            return res.status(400).json({
                success: false,
                message: "You cannot pay yourself"
            });
        }

        // Sender bank details check
        if (!sender.accountNumber) {
            return res.status(400).json({
                success: false,
                message: "Please add your bank details first"
            });
        }

        // Receiver bank details check
        if (!receiver.accountNumber) {
            return res.status(400).json({
                success: false,
                message: "Receiver has not added bank details"
            });
        }

        // Balance check
        if (sender.accountBalance < amount) {
            return res.status(400).json({
                success: false,
                message: "Insufficient balance"
            });
        }

        // Transfer money
        sender.accountBalance -= amount;
        receiver.accountBalance += amount;

        await sender.save();
        await receiver.save();

        // Create transaction
        const transaction = await Transaction.create({
            senderId: sender._id,
            receiverId: receiver._id,
            amount
        });

        return res.status(200).json({
            success: true,
            message: "QR payment successful",
            transaction
        });

    } catch (error) {

        console.error("QR Payment Error:", error);

        return res.status(500).json({
            success: false,
            message: "Internal Server Error"
        });

    }

};

const logout = async (req, res) => {

    try {

        res.status(200).json({
            message: "Logout Successful"
        });

    } catch (error) {

        res.status(500).json({
            message: error.message
        });

    }

};

const editProfile = async (req, res) => {

    try {

        const {
            firstName,
            lastName,
            phoneNumber,
            email
        } = req.body;

        // Check if at least one field is provided
        if (!firstName && !lastName && !phoneNumber && !email) {
            return res.status(400).json({
                success: false,
                message: "Please provide at least one field to update"
            });
        }

        // Find logged-in user
        const user = await User.findById(req.user.id);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        // Check if email already exists
        if (email) {

            const existingEmail = await User.findOne({
                email,
                _id: { $ne: req.user.id }
            });

            if (existingEmail) {
                return res.status(409).json({
                    success: false,
                    message: "Email already in use"
                });
            }

            user.email = email;
        }

        // Check if phone number already exists
        if (phoneNumber) {

            const existingPhone = await User.findOne({
                phoneNumber,
                _id: { $ne: req.user.id }
            });

            if (existingPhone) {
                return res.status(409).json({
                    success: false,
                    message: "Phone number already in use"
                });
            }

            user.phoneNumber = phoneNumber;
        }

        // Update remaining fields
        if (firstName) {
            user.firstName = firstName;
        }

        if (lastName) {
            user.lastName = lastName;
        }

        await user.save();

        return res.status(200).json({
            success: true,
            message: "Profile updated successfully",
            data: {
                firstName: user.firstName,
                lastName: user.lastName,
                phoneNumber: user.phoneNumber,
                email: user.email
            }
        });

    } catch (error) {

        console.error("Edit Profile Error:", error);

        return res.status(500).json({
            success: false,
            message: "Internal Server Error"
        });

    }

};

const changePassword = async (req, res) => {

    try {

        const { currentPassword, newPassword } = req.body;

        const user = await User.findById(req.user.id);

        if (!user) {
            return res.status(404).json({
                message: "User not found"
            });
        }

        const isMatch = await bcrypt.compare(
            currentPassword,
            user.password
        );

        if (!isMatch) {
            return res.status(400).json({
                message: "Current Password is Incorrect"
            });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);

        user.password = hashedPassword;

        await user.save();

        res.status(200).json({
            message: "Password Changed Successfully"
        });

    } catch (error) {

        res.status(500).json({
            message: error.message
        });

    }

};

const editBankDetails = async (req, res) => {

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

        if (bankName) {
            user.bankName = bankName;
        }

        if (accountHolderName) {
            user.accountHolderName = accountHolderName;
        }

        if (accountNumber) {
            user.accountNumber = accountNumber;
        }

        if (ifscCode) {
            user.ifscCode = ifscCode;
        }

        if (address) {
            user.address = address;
        }

        if (pincode) {
            user.pincode = pincode;
        }

        await user.save();

        res.status(200).json({
            message: "Bank Details Updated Successfully",
            data: user
        });

    } catch (error) {

        res.status(500).json({
            message: error.message
        });

    }

};

const getProfile = async (req, res) => {

    try {

        const user = await User.findById(req.user.id);

        if (!user) {
            return res.status(404).json({
                message: "User not found"
            });
        }

        res.status(200).json({

            firstName: user.firstName,
            lastName: user.lastName,
            phoneNumber: user.phoneNumber,
            email: user.email,

            bankName: user.bankName,
            accountHolderName: user.accountHolderName,
            accountNumber: user.accountNumber,
            ifscCode: user.ifscCode,
            address: user.address,
            pincode: user.pincode

        });

    } catch (error) {

        res.status(500).json({
            message: error.message
        });

    }

};

const getReceipt = async (req, res) => {

    try {

        const transaction = await Transaction.findById(req.params.transactionId)
            .populate("senderId", "firstName lastName phoneNumber")
            .populate("receiverId", "firstName lastName phoneNumber");

        if (!transaction) {
            return res.status(404).json({
                message: "Transaction not found"
            });
        }

        res.status(200).json({

            message: "Payment Receipt",

            transactionId: transaction._id,

            sender: {
                name: transaction.senderId.firstName + " " + transaction.senderId.lastName,
                phoneNumber: transaction.senderId.phoneNumber
            },

            receiver: {
                name: transaction.receiverId.firstName + " " + transaction.receiverId.lastName,
                phoneNumber: transaction.receiverId.phoneNumber
            },

            amount: transaction.amount,

            status: "SUCCESS",

            paymentMethod: "PayRight Wallet",

            date: transaction.createdAt.toLocaleDateString(),

            time: transaction.createdAt.toLocaleTimeString()

        });

    } catch (error) {

        res.status(500).json({
            message: error.message
        });

    }

};

module.exports = { signUp, login , addBankDetails, searchUser, sendMoney, History, CheckBalance, generateQR, qrpay, logout, editProfile, changePassword, editBankDetails, getProfile, getReceipt};
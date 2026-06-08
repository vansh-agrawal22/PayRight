const User = require("../models/userModel");
const bcrypt = require("bcrypt");
const { generateJWT } = require("../jwt");

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

module.exports = { signUp, login };
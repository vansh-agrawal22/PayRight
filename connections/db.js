const mongoose = require("mongoose");

const connectDB = async () => {

    try {
        await mongoose.connect("mongodb://127.0.0.1:27017/PayRightUsers");

    } catch (err) {
        console.log("Database connection failed", err);

    }
};

module.exports = connectDB;
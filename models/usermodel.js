const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
    
    firstName: {
        type: String,
        required: true,
        trim: true
    },

    lastName: {
        type: String,
        required: true,
        trim: true
    },

    phoneNumber: {
        type: String,
        required: true,
        unique: true
    },

    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true
    },

    password: {
        type: String,
        required: true
    },
    
    bankName:{
        type:String,
    },
    accountNumber:{
        type:String,
    },
    accountHolderName:{
        type:String,
    },
    ifscCode:{
        type:String,
    },
    address:{
        type:String,
    },  
    pincode:{
        type:String,
    },  
    accountBalance:{
        type:Number,
        default:0 
       }

});

const User = mongoose.model("User", userSchema);

module.exports = User;
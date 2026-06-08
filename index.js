const express = require("express");
const connectDB = require("./connections/db");
const authRoutes = require("./routes/authRoutes");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 8080;

// middleware
app.use(express.json());// for parsing application/json

// database connection
connectDB().then(()=>{
    console.log("Database connected successfully");
});

// routes
app.use("/auth", authRoutes);

app.listen(PORT, () => {
    console.log(`Server started on port ${PORT}`);
});


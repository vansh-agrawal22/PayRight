const jwt = require("jsonwebtoken");

//check and verify jwt token function
const jwtAuthMiddleware = (req, res, next) => {
    //extract token from header
   const authHeader = req.headers.authorization;

if(!authHeader){
    return res.status(401).json({
        message:"Unauthorized"
    });
}

const token = authHeader.split(" ")[1];
    try{
        //verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    }
     catch(err){
        return res.status(401).json({
            message: "Invalid token"
        });
    }

}

//function to generate jwt token
const generateJWT = (userdata) => {
    return jwt.sign(userdata, process.env.JWT_SECRET, { expiresIn: '2h' });
};


module.exports = { jwtAuthMiddleware, generateJWT };
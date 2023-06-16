const jwt = require('jsonwebtoken');
require('dotenv').config();

const verifyJWT = (req, res, next) => {
    const authHeader = req.headers.authorization || req.headers.Authorization;
    console.log(authHeader)
    if (!authHeader?.startsWith('Bearer ')) return res.sendStatus(401);
    const token = authHeader.split(' ')[1];

    jwt.verify(
        token,
        process.env.SECRET,
        (err, decoded) => {
            if (err) return res.sendStatus(403);
            req.user = decoded.user;
            next();
        }
    )
}

module.exports = verifyJWT;
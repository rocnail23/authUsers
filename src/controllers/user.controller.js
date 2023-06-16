const catchError = require('../utils/catchError');
const User = require('../models/User');
const bcrypt = require("bcrypt")
const sendEmail = require("../utils/sendEmail");
const EmailCode = require('../models/EmailCode');
const jwt = require("jsonwebtoken");
const { where } = require('sequelize');

const getAll = catchError(async(req, res) => {
    const results = await User.findAll();
    return res.json(results);
});

const create = catchError(async(req, res) => {
    const {password,firstName, lastName, email, frontBaseUrl} = req.body
    const body = req.body
    body.password = await bcrypt.hash(password,10)
    const result = await User.create(body);
    const code = require("crypto").randomBytes(64).toString("hex")
    const url = `${frontBaseUrl}/verify_email/${code}`
    const send = await sendEmail({
        to:email,
        subject: "verificacion de cuenta",
        html: `<div><h1> verifica tu cuenta<h1/>
                <a href="${url}"> has click aqui para verificar tu usuario<a/><div/>`
    })

    const emailcode = {
        code,
        userId: result.id 
    }

    await EmailCode.create(emailcode)


    return res.status(201).json({result,send});

    
});

const getOne = catchError(async(req, res) => {
    const { id } = req.params;
    const result = await User.findByPk(id);
    if(!result) return res.sendStatus(404);
    return res.json(result);
});

const remove = catchError(async(req, res) => {
    const { id } = req.params;
    await User.destroy({ where: {id} });
    return res.sendStatus(204);
});

const update = catchError(async(req, res) => {
    const { id } = req.params;
    const result = await User.update(
        req.body,
        { where: {id}, returning: true }
    );
    if(result[0] === 0) return res.sendStatus(404);
    return res.json(result[1][0]);
});

const verifyCode = catchError(async(req,res) => {
    const {code} = req.params
    
    const emailcode = await EmailCode.findOne({where: {code} })
    if(!emailcode) return res.sendStatus(401)
    const body = {
        isVerify: true
    }
    const UserUpdate = await User.update(body,{where:{id:emailcode.userId}, returning:true})
    await emailcode.destroy()
    res.json(UserUpdate[1][0])
})

    const loginUser = catchError(async(req,res) => {
     
        const {email,password} = req.body

        const user = await User.findOne({where:{email}})
        console.log(user)
        if(!user) return res.sendStatus(401)

        const isPassword = await bcrypt.compare(password,user.password)
        if(!isPassword) return res.sendStatus(401)
        const token = jwt.sign({user},process.env.SECRET,{
            expiresIn: 3600,
        })
        res.status(201).json({token})


    })

    const getLogin = catchError(async(req,res) => {
        const user = req.user
        if(user.isVerify == false) return 401
        res.json(user)
    })

    const changePassword = catchError(async(req,res) => {

        const {email, frontBaseUrl} = req.body
        const user = await User.findOne({where:{email}})
        if(!user) return res.sendStatus(401)
        const code = require("crypto").randomBytes(64).toString("hex")
        const body = {
            code,
            userId: user.id
        }
        await EmailCode.create(body)
        const emailBody = {
            to: user.email,
            subject: "cambiar password",
            html: `<div> 
                    <h1> hola haz click aqui para cambiar la contraseña<h1/>
                    <a href="${frontBaseUrl}/reset_password/${code}"> click aqui <a/>
                    <div/>`
        }
        const resEmail = await sendEmail(emailBody)
        res.json(resEmail)

    })

    const updatePassword = catchError(async(req,res) => {
        const {code} = req.params
        const {password} = req.body      
        const codeEmail = await EmailCode.findOne({where:{code}})
        if(!codeEmail) return res.sendStatus(401)
        const hashPassword = await bcrypt.hash(password,10)
        const userUpdate = await User.update({password : hashPassword},{where:{id:codeEmail.userId}, returning:true})
        codeEmail.destroy()
        res.json(userUpdate[1][0])
    })

module.exports = {
    getAll,
    create,
    getOne,
    remove,
    update,
    verifyCode,
    loginUser,
    getLogin,
    changePassword,
    updatePassword
}
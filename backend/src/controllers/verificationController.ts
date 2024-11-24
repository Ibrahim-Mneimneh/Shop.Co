import nodemailer from 'nodemailer';
import path from 'path';
import fs from "fs"
import handlebars from "handlebars"
import { v4 as uuidv4 } from 'uuid';
import jwt from 'jsonwebtoken';
import { IUser } from '../models/userModel';


export const emailVerification = async (user:IUser,recipientEmail:string,firstname:string,subject:string="Email Verification") => {
  try {
    const transporter = nodemailer.createTransport({
      service: process.env.CENTRAL_SERVICE,
      auth: {
        user: process.env.CENTRAL_NAME,
        pass: process.env.CENTRAL_PASS,
      },
    });
    const templatePath = path.join(__dirname, "verifyEmail.hbs");
    const source = fs.readFileSync(templatePath, "utf8");
    const template = handlebars.compile(source);

    //Generate token
    const token =generateEmailToken(recipientEmail,)
    const verificationUrl = `http://${process.env.HOST}:${process.env.PORT}/api/${process.env.VERSION}/auth/verify/${token}`;
    const mailOptions = {
      from: process.env.CENTRAL_NAME,
      to: recipientEmail,
      subject,
      html: template({ subject, firstname,verificationUrl}),
    };
    transporter.sendMail(mailOptions, function (error, info) {
      if (error) {
        throw Error("Error sending email");
      }
    });
    user.verificationTokenExpiresAt=new Date(Date.now() +15 * 60 * 1000)
    await user.save()
  } catch (error:any) {
    throw Error(error);  
  }
};



const generateEmailToken= (email:string):string=>{
    const payload = {
    email,
    id: uuidv4(), // To add randomeness to the token 
  };

  const token = jwt.sign(payload, process.env.JWT_VERIFICATION_SECRET!, { expiresIn: '15m' });
  return token;
}
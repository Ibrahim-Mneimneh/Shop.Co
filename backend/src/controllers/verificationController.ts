import nodemailer from 'nodemailer';
import path from 'path';
import fs from "fs"
import handlebars from "handlebars"
import { v4 as uuidv4 } from 'uuid';
import jwt from 'jsonwebtoken';


export const emailVerification = async (recipientEmail:string,firstname:string,subject:string="Email Verification") => {
  try {
    const transporter = nodemailer.createTransport({
      service: process.env.centralService,
      auth: {
        user: process.env.centralName,
        pass: process.env.centralPass,
      },
    });
    const templatePath = path.join(__dirname, "verifyEmail.hbs");
    const source = fs.readFileSync(templatePath, "utf8");
    const template = handlebars.compile(source);

    //Generate token
    const token =generateEmailToken(recipientEmail,)
    const verificationUrl = `http://${process.env.HOST}:${process.env.PORT}/api/${process.env.VERSION}/auth/verify/${token}`;
    const mailOptions = {
      from: process.env.centralName,
      to: recipientEmail,
      subject,
      html: template({ subject, firstname}),
    };
    transporter.sendMail(mailOptions, function (error, info) {
      if (error) {
        throw Error("Error sending email");
      }
    });
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
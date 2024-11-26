import { verifyEmailAuth } from '../controllers/authController';
import express, { Router } from 'express';

const router: Router = express.Router();

router.get("/verify/:token",verifyEmailAuth)


export const authRouter=router
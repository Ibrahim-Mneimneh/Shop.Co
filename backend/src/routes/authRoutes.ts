import { verifyEmailAuth } from '../controllers/authContoller';
import express, { Router } from 'express';

const router: Router = express.Router();

router.get("/verify/:token",verifyEmailAuth)

export const authRouter=router
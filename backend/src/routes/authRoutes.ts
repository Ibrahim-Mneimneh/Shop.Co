import { verifyEmailAuth } from '../controllers/authContoller';
import express, { Router } from 'express';
import { authMiddleware } from '../middleware/authMiddleware';

const router: Router = express.Router();

router.get("/verify/:token",verifyEmailAuth)

router.use("/user",authMiddleware)


export const authRouter=router
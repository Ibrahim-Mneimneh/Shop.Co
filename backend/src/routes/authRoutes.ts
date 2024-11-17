import { verifyEmailAuth } from 'controllers/authContoller';
import express, { Router } from 'express';

const router: Router = express.Router();

router.get("/auth/:token",verifyEmailAuth)

export const authRoutes=router
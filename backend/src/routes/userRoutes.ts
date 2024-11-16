import express, { Request, Response, Router } from 'express';
import { registerUser } from '../controllers/userController';

const router: Router = express.Router();

// Register 
router.post("/register",registerUser);

export const userRouter:Router = router;

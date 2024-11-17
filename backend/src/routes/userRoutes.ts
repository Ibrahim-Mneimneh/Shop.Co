import express, { Request, Response, Router } from 'express';
import { registerUser } from '../controllers/userController';

const router: Router = express.Router();

// Register 
router.post("/register",registerUser);
// Login
router.post("/login")

// Get profile

// Update profile

// Get cart
// Update cart

// Make an order 

// View users' orders

// View users' order
export const userRouter:Router = router;

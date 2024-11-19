import express, { Router } from 'express';
import { loginUser, registerUser } from '../controllers/userController';

const router: Router = express.Router();

// Register 
router.post("/register",registerUser);
// Login
router.post("/login",loginUser)

// Get profile

// Update profile

// Get cart
// Update cart

// Make an order 

// View users' orders

// View users' order
export const userRouter:Router = router;

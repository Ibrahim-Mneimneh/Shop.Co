import express, { Router } from 'express';
import { loginUser, registerUser } from '../controllers/userController';

const router: Router = express.Router();

// Register 
router.post("/register",registerUser);
// Login
router.post("/login",loginUser)

// Get profile
router.get("/")
// Update profile
router.put("/")
// Get cart
router.get("/cart")
// Make an order
router.post("/cart/order")
// View users' orders
router.get("/orders")
// View users' order
router.get("/orders/:orderId")
export const userRouter:Router = router;

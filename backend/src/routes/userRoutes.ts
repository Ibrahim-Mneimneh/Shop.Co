import express, { Router } from 'express';
import { getUser, loginUser, registerUser } from '../controllers/userController';
import { authMiddleware } from '../middleware/authMiddleware';
import { addToCart, getCart, updateProductCartQuantity } from '../controllers/cartController';

const router: Router = express.Router();

// Register & Login
router.post("/register",registerUser);
router.post("/login",loginUser)

// Authentication
router.use("/",authMiddleware)

// Get profile
router.get("/",getUser)
// Update profile (not finished)
router.put("/")
// Get cart
router.get("/cart",getCart)
// Add Product to Cart
router.post("/cart",addToCart)
// Update product quantity in the cart
router.patch("/cart/products/:variantId",updateProductCartQuantity)
// Make an order
router.post("/cart/order")
// View users' orders
router.get("/orders")
// View users' order
router.get("/orders/:orderId")
export const userRouter:Router = router;

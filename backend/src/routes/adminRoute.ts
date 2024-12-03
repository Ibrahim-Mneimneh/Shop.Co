import express, { Router } from 'express';
import { addProduct, addProductImage, adminLogin } from '../controllers/adminController';
import { authMiddleware } from '../middleware/authMiddleware';

const router: Router = express.Router();

// Add product
router.post("/login",adminLogin)
router.use("/",authMiddleware)
router.post("/products",addProduct)
router.post("/products/images",addProductImage)

export const adminRoutes=router
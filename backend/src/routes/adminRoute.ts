import express, { Router } from 'express';
import { addProduct, adminLogin } from '../controllers/adminController';

const router: Router = express.Router();

// Add product
router.post("/login",adminLogin)
router.post("/products",addProduct)

export const adminRoutes=router
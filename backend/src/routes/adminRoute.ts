import express, { Router } from 'express';
import { addProduct, addProductImage, addProductVariant, adminLogin, deleteProduct, restockProduct, updateVariantSale } from '../controllers/adminController';
import { authMiddleware } from '../middleware/authMiddleware';
import { sessionMiddleware } from '../middleware/sessionMiddleware';

const router: Router = express.Router();

// Add product
router.post("/login",adminLogin)
router.use("/",authMiddleware)
router.post("/products",addProduct)
router.post("/products/images",addProductImage)
router.patch("/products/variants/:variantId",updateVariantSale)
router.patch("/products/:productId",sessionMiddleware,restockProduct)
router.post("/products/:productId",sessionMiddleware,addProductVariant)
router.delete("/products/:productId",sessionMiddleware,deleteProduct)


export const adminRoutes=router
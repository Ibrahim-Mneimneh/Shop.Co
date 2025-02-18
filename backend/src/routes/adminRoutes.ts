import express, { Router } from "express";
import {
  adminLogin,
  getProduct,
  updateDeliveryStatus,
} from "../controllers/admin/adminController";
import {
  adminAuthMiddleware,
} from "../middleware/authMiddleware";
import { sessionMiddleware } from "../middleware/sessionMiddleware";
import { getDashboard, getMostSoldProducts, getPendingOrders, getRecentOrders } from "../controllers/admin/dashboard/dashboardController";
import { addProduct, addProductImage, addProductVariant, deleteProduct, deleteProductVariant, reActivateProduct, restockProduct } from "../controllers/admin/product/productController";
import { deleteVariantSale, updateVariantSale } from "../controllers/admin/product/saleController";
import { searchProductAgg } from "../controllers/admin/search/aggregates";
import { productSearch } from "../controllers/admin/search/searchController";

const router: Router = express.Router();

// Admin Login
router.post("/login", adminLogin);

// Authentication Middleware for all subsequent routes
router.use(adminAuthMiddleware);

// Dashboard routes
router.get("/dashboard", getDashboard);
router.get("/orders/pending", getPendingOrders);
router.get("/orders/recent", getRecentOrders);
router.get("/products/mostSold", getMostSoldProducts);

// Product routes
router.get("/products",productSearch);
router.post("/products", addProduct);
router.get("/products/:productId", getProduct); // Modify for later
router.post("/products/images", addProductImage);
router.post("/products/:productId/variants", sessionMiddleware, addProductVariant);
router.patch("/products/variants/sales/:variantId", sessionMiddleware, updateVariantSale);
router.delete("/products/variants/sales/:variantId", sessionMiddleware, deleteVariantSale);
router.delete("/products/:productId", sessionMiddleware, deleteProduct);
router.patch("/products/:productId/activate",sessionMiddleware,reActivateProduct);
router.delete("/products/variants/:variantId", deleteProductVariant);
router.patch("/products/restock/:productId", sessionMiddleware, restockProduct);

// Update Order Status
router.patch("/orders/:orderId/status", updateDeliveryStatus);

export const adminRoutes = router;

import express, { Router } from "express";
import {
  addProduct,
  addProductImage,
  addProductVariant,
  adminLogin,
  deleteProduct,
  deleteProductVariant,
  deleteVariantSale,
  getProduct,
  restockProduct,
  updateDeliveryStatus,
  updateVariantSale,
} from "../controllers/admin/adminController";
import {
  adminAuthMiddleware,
  authMiddleware,
} from "../middleware/authMiddleware";
import { sessionMiddleware } from "../middleware/sessionMiddleware";
import { getDashboard, getMostSoldProducts, getPendingOrders, getRecentOrders } from "../controllers/admin/dashboard/dashboard";

const router: Router = express.Router();

// Add product
router.post("/login", adminLogin);

// Auth Middleware for routes
router.use("/", adminAuthMiddleware);
// Get Dashboard 
router.get("/dashboard",getDashboard);
// Add Product
router.post("/products", addProduct);
// Add Product Images
router.post("/products/images", addProductImage);
// Get most Sold Products 
router.get("/products/mostSold",getMostSoldProducts)
// Get delivery pending Products 
router.get("/orders/pending",getPendingOrders)
// Get most Sold Products 
router.get("/orders/recent",getRecentOrders)
// Get Product & its variants
router.get("/products/:productId", getProduct); // *********** Modify for later
// Add varinat Sale or update it
router.patch(
  "/products/variants/sales/:variantId",
  sessionMiddleware,
  updateVariantSale
);
// Delete variant Sale
router.delete(
  "/products/variants/sales/:variantId",
  sessionMiddleware,
  deleteVariantSale
);
// Soft Delete Product
router.delete("/products/:productId", sessionMiddleware, deleteProduct);
// Soft Delete Variant
router.delete("/products/variants/:variantId", deleteProductVariant);
// Restock Product
router.patch("/products/restock/:productId", sessionMiddleware, restockProduct);
// Add Variant for a Product
router.post(
  "/products/:productId/variants",
  sessionMiddleware,
  addProductVariant
);
// Update Order Status
router.patch("/orders/:orderId/status", updateDeliveryStatus);

export const adminRoutes = router;

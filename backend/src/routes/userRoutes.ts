import express, { Router } from "express";
import {
  confirmPayment,
  getOrder,
  getOrders,
  getUser,
  loginUser,
  orderProduct,
  registerUser,
} from "../controllers/user/userController";
import { authMiddleware } from "../middleware/authMiddleware";
import {
  addToCart,
  deleteCartProduct,
  getCart,
  updateProductCartQuantity,
} from "../controllers/user/cartController";
import { deleteProductReview, reviewProduct, updateProductReview } from "../controllers/user/ratingController";

const router: Router = express.Router();

// Register & Login
router.post("/register", registerUser);
router.post("/login", loginUser);

// Authentication
router.use("/", authMiddleware);

// Profile
router.get("/", getUser);

// Cart 
router.get("/cart", getCart);
router.post("/cart", addToCart);
router.patch("/cart/products/:variantId", updateProductCartQuantity);
router.delete("/cart/products/:variantId", deleteCartProduct);

// Order
router.get("/orders", getOrders);
router.get("/orders/:orderId", getOrder);
router.post("/cart/order", orderProduct); 
router.post("/orders/payment", confirmPayment); // Confirm Payment (for testing now)

// Product Review
router.post("/variants/:variantId/orders/:orderId",reviewProduct)
router.patch("/variants/:variantId/reviews/:reviewId",updateProductReview)
router.delete("/variants/:variantId/reviews/:reviewId", deleteProductReview);
export const userRouter: Router = router;

/**
 * @openapi
 * /user/register:
 *   post:
 *     summary: Register a New User
 *     tags:
 *       - User
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               firstname:
 *                 type: string
 *               lastname:
 *                 type: string
 *               country:
 *                 type: string
 *               postalCode:
 *                 type: integer
 *               bldngNum:
 *                 type: integer
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *             example:
 *               firstname: "John"
 *               lastname: "Doe"
 *               country: "USA"
 *               postalCode: 12345
 *               bldngNum: 101
 *               email: "john.doe@example.com"
 *               password: "TuenUI-88"
 *     responses:
 *       201:
 *         description: Successful
 *       400:
 *         description: Bad request
 */

/**
 * @openapi
 * /user/login:
 *   post:
 *     summary: Login an Existing User
 *     tags:
 *       - User
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *             example:
 *               email: "john.doe@example.com"
 *               password: "TuenUI-88"
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Login Successful"
 *                 data:
 *                   type: object
 *                   properties:
 *                     name:
 *                       type: string
 *                       example: "Jerrell Langosh"
 *                     email:
 *                       type: string
 *                       example: "ib79mneimneh@gmail.com"
 *                     address:
 *                       type: string
 *                       example: "Liechtenstein,455,326"
 *                 token:
 *                   type: string
 *                   example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *       400:
 *         description: The request failed, often due to missing a required parameter.
 *       403:
 *         description: Invalid credetials
 *       404:
 *         description: User not found
 */

/**
 * @openapi
 * /user/:
 *   get:
 *     tags:
 *       - User
 *     summary: Get User Profile
 *     security:
 *       - BearerAuth: []
 *     description: Returns the profile information of the logged-in user.
 *     responses:
 *       200:
 *         description: User profile retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Successful"
 *                 data:
 *                   type: object
 *                   properties:
 *                     name:
 *                       type: string
 *                       example: "Jerrell Langosh"
 *                     email:
 *                       type: string
 *                       example: "john.doe@example.com"
 *                     address:
 *                       type: string
 *                       example: "Liechtenstein,455,326"
 *       401:
 *         description: Unauthorized, often invalid token (expired/invalid)
 *       404:
 *         description: User not found
 */

/**
 * @openapi
 * /user/cart:
 *   get:
 *     tags:
 *       - User
 *     summary: Get Cart
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Cart retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Successful"
 *                 data:
 *                   type: object
 *                   properties:
 *                     cartData:
 *                       type: object
 *                       properties:
 *                         products:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               variant:
 *                                 type: object
 *                                 properties:
 *                                   unitsSold:
 *                                     type: integer
 *                                     example: 0
 *                                   _id:
 *                                     type: string
 *                                     example: "6771d4113929839a4e1872c9"
 *                                   images:
 *                                     type: array
 *                                     items:
 *                                       type: string
 *                                       example: "67537749dad1102f03686bb4"
 *                                   color:
 *                                     type: string
 *                                     example: "#FFFFFF"
 *                                   originalPrice:
 *                                     type: number
 *                                     example: 29.99
 *                                   isOnSale:
 *                                     type: boolean
 *                                     example: false
 *                                   stockStatus:
 *                                     type: string
 *                                     example: "In Stock"
 *                                   product:
 *                                     type: object
 *                                     properties:
 *                                       name:
 *                                         type: string
 *                                         example: "Blue Jeans"
 *                                       rating:
 *                                         type: number
 *                                         example: 0
 *                               quantity:
 *                                 type: array
 *                                 items:
 *                                   type: object
 *                                   properties:
 *                                     quantity:
 *                                       type: integer
 *                                       example: 4
 *                                     size:
 *                                       type: string
 *                                       example: "M"
 *                     totalPrice:
 *                       type: number
 *                       example: 119.96
 *       400:
 *         description: The request failed, often due to missing a required parameter.
 *       401:
 *         description: Unauthorized, often invalid token (expired/invalid)
 *       404:
 *         description: Cart not found
 */

/**
 * @openapi
 * /user/cart:
 *   post:
 *     tags:
 *       - User
 *     summary: Add a Product to the Cart
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               productId:
 *                 type: string
 *               quantity:
 *                 type: integer
 *             example:
 *               productId: "6771d4113929839a4e1872c9"
 *               quantity: 4
 *     responses:
 *       200:
 *         description: Product successfully added to cart
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Product successfully added"
 *                 data:
 *                   type: object
 *                   properties:
 *                     products:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           variant:
 *                             type: string
 *                             example: "6771d4113929839a4e1872c9"
 *                           quantity:
 *                             type: integer
 *                             example: 4
 *                           size:
 *                             type: string
 *                             example: "M"
 *       400:
 *         description: The request failed, often due to missing a required parameter.
 *       401:
 *         description: Unauthorized, often invalid token (expired/invalid)
 *       404:
 *         description: Size/Product not found
 */

/**
 * @openapi
 * /user/cart/products/{variantId}:
 *   patch:
 *     tags:
 *       - User
 *     summary: Update a Product Quantity in the Cart
 *     description: Increment or decrement a product in the cart, based on the size.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: variantId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the product variant to update.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               operation:
 *                 type: string
 *                 enum:
 *                   - increment
 *                   - decrement
 *               size:
 *                 type: string
 *             example:
 *               operation: "decrement"
 *               size: "M"
 *     responses:
 *       200:
 *         description: Cart updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Cart updated successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     products:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           variant:
 *                             type: string
 *                             example: "6771d4113929839a4e1872c9"
 *                           quantity:
 *                             type: array
 *                             items:
 *                               type: object
 *                               properties:
 *                                 quantity:
 *                                   type: integer
 *                                   example: 3
 *                                 size:
 *                                   type: string
 *                                   example: "M"
 *                                 _id:
 *                                   type: string
 *                                   example: "6778612bf08f2ef08c6d95f8"
 *                           _id:
 *                             type: string
 *                             example: "6778612bf08f2ef08c6d95f7"
 *                     __v:
 *                       type: integer
 *                       example: 0
 *       404:
 *         description: Size/Product not found or requested size isn't available
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Requested size isn't available"
 *       400:
 *         description: The request failed, often due to missing a required parameter.
 *       401:
 *         description: Unauthorized, often invalid token (expired/invalid)
 */

/**
 * @openapi
 * /user/cart/products/{variantId}:
 *   delete:
 *     tags:
 *       - User
 *     summary: Remove a Product from the Cart
 *     description: Removes a specific product variant from the cart based on the provided size.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: variantId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the product variant to remove.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               size:
 *                 type: string
 *             example:
 *               size: "S"
 *     responses:
 *       200:
 *         description: Product removed successfully and the updated cart is returned
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Product removed successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     products:
 *                       type: array
 *                       items:
 *                         type: object
 *                     __v:
 *                       type: integer
 *                       example: 0
 *       404:
 *         description: The product was not found in the cart
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Cart has no matching product."
 *       400:
 *         description: The request failed, often due to missing a required parameter.
 *       401:
 *         description: Unauthorized, often invalid token (expired/invalid)
 */

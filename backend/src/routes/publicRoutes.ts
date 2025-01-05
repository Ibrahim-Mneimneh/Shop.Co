
import express, { Router } from 'express';
import { getFilteredProducts, getImage, getVariant} from '../controllers/publicController';

const router: Router = express.Router();

router.get("/images/:imageId",getImage)
router.get("/products/", getFilteredProducts)
router.get("/products/:variantId", getVariant)

export const publicRouter=router

/**
 * @swagger
 * tags:
 *   - name: Public 
 *     description: Operations related to Viewing, Searching or Filtering Products
 */

/**
 * @swagger
 * /products/:
 *   post:
 *     summary: Get filtered products  
 *     tags:
 *          - Public
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
 *         description: User registered successfully
 *       400:
 *         description: Bad request
 */
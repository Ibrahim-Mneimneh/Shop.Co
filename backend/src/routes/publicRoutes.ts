
import express, { Router } from 'express';
import { getFilteredProducts, getImage, getProduct } from '../controllers/publicController';

const router: Router = express.Router();

router.get("/images/:imageId",getImage)
router.get("/products/", getFilteredProducts)
router.get("/products/:productId", getProduct)

export const publicRouter=router
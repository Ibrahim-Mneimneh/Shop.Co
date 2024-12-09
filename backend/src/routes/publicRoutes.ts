
import express, { Router } from 'express';
import { getImage, getProduct } from '../controllers/publicController';

const router: Router = express.Router();

router.get("/images/:imageId",getImage)

router.get("/products/:productId", getProduct)

export const publicRouter=router
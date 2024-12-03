
import express, { Router } from 'express';
import { getImage } from '../controllers/publicController';

const router: Router = express.Router();

router.get("/images/:imageId",getImage)

export const publicRouter=router
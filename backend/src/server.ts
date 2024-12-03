import express, { Request, Response,Application } from 'express';
import dotenv from "dotenv"
import mongoose from 'mongoose';
import clc from "cli-color"
import {engine} from "express-handlebars"
import path from 'path';


import { userRouter } from './routes/userRoutes';
import { authRouter} from "./routes/authRoutes"
import { adminRoutes } from './routes/adminRoute';
import { publicRouter } from './routes/publicRoutes';


dotenv.config({ path: __dirname + '/.env' });
const app: Application = express();
const PORT = process.env.PORT || 4004



// Set the view engine to Handlebars
app.engine('handlebars', engine());
app.set('views', path.join(__dirname,'views'));
app.set('view engine', 'handlebars');
app.use(express.static(path.join(__dirname, '../public')));

// Limiting JSON size
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

app.use(async(req: Request, res: Response, next: Function) => {
  const timestamp = new Date().toISOString(); // Current timestamp
  const method = req.method; // HTTP method (GET, POST, etc.)
  const path = req.path; // Request path
  const ip = req.ip; // IP address
  const userAgent = req.get('User-Agent'); // (browser info)

  // Log the request information
  console.log(`[${timestamp}] ${clc.green(method)} ${path}`);

  // Pass control to the next middleware or route handler
  next();
});

// Routes
app.use("/api/"+process.env.VERSION+"/public", publicRouter);
app.use("/api/"+process.env.VERSION+"/user", userRouter);
app.use("/api/"+process.env.VERSION+"/auth", authRouter);
app.use("/api/"+process.env.VERSION+"/admin",adminRoutes)

// Error handling middleware
app.use((err: any, req: Request, res: Response, next: Function) => {
  console.error(err.stack);
  res.status(500).send({ message: "Something went wrong!" });
});

mongoose.connect(process.env.MONGO_URI as string)
  .then(() => console.log('Successfully connected to Database!'))
  .catch((err) => console.error('Failed to connect to MongoDB:', err));

app.listen(PORT, () => {
  console.log(`Server is running at http://${process.env.HOST}:${PORT}`);
});

export default app
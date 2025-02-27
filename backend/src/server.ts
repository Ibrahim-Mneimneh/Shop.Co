import express, { Request, Response, Application, NextFunction } from "express";
import dotenv from "dotenv";
import mongoose from "mongoose";
import clc from "cli-color";
import { engine } from "express-handlebars";
import path from "path";
import cron from "node-cron";
import swaggerUi from "swagger-ui-express";

import { userRouter } from "./routes/userRoutes";
import { authRouter } from "./routes/authRoutes";
import { adminRoutes } from "./routes/adminRoutes";
import { publicRouter } from "./routes/publicRoutes";
import swaggerDoc from "./utils/swaggerConfig";
import { SaleHandler } from "./utils/cronFunctions";
import { HttpError } from "./utils/customErrors";

dotenv.config({ path: __dirname + "/.env" });
const app: Application = express();
const PORT = process.env.PORT || 4004;
const VERSION = process.env.VERSION || "v0";

// Set the view engine to Handlebars
app.engine("handlebars", engine());
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "handlebars");
app.use(express.static(path.join(__dirname, "../public")));

// Limiting JSON size
app.use(express.json({ limit: "5Mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

app.use(async (req: Request, res: Response, next: Function) => {
  const timestamp = new Date().toISOString(); // Current timestamp
  const method = req.method; // HTTP method (GET, POST, etc.)
  const path = req.path; // Request path
  const ip = req.ip; // IP address
  const userAgent = req.get("User-Agent"); // (browser info)

  // Log the request information
  console.log(`[${timestamp}] ${clc.green(method)} ${path}`);

  // Pass control to the next middleware or route handler
  next();
});

// Routes
app.use(`/api/${VERSION}/public`, publicRouter);
app.use(`/api/${VERSION}/user`, userRouter);
app.use(`/api/${VERSION}/auth`, authRouter);
app.use(`/api/${VERSION}/admin`, adminRoutes);
// Documentation Route
app.use(`/api/${VERSION}/docs`, swaggerUi.serve, swaggerUi.setup(swaggerDoc));

// Unavailable Route Middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  next(new HttpError("The requested URL is not found", 404));
});

// Global Error Middleware
app.use((err: HttpError, req: Request, res: Response, next: NextFunction) => {
  // Get the statusCode, name & message
  const statusCode = err.statusCode || 500;
  const message = err.message || "Internal Server Error";

  // Display Server errors only
  if (statusCode >= 500) {
    console.error(`${clc.red("Server Error")}: ${message}`);
  }
  res.status(statusCode).json({ message });
});

mongoose
  .connect(process.env.MONGO_URI as string)
  .then(() => console.log("Successfully connected to Database!"))
  .catch((err) => console.error("Failed to connect to MongoDB:", err));

app.listen(PORT, () => {
  console.log(`Server is running at http://${process.env.HOST}:${PORT}/api/${VERSION}/`);
});

// Scheduled Sale Activation/Deactivation
cron.schedule("3 * * * *", SaleHandler);

export default app;

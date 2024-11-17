import express, { Request, Response,Application } from 'express';
import dotenv from "dotenv"
import { userRouter } from './routes/userRoutes';

dotenv.config({ path: __dirname + '/.env' });
const app: Application = express();
const PORT = process.env.PORT || 4004

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb" }));


// Routes
app.use("/api/"+process.env.VERSION+"/user", userRouter);

// Error handling middleware
app.use((err: any, req: Request, res: Response, next: Function) => {
  console.error(err.stack);
  res.status(500).send({ message: "Something went wrong!" });
});

app.listen(PORT, () => {
  console.log(`Server is running at http://${process.env.HOST}:${PORT}`);
});

export default app
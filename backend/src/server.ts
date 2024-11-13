import express, { Request, Response } from 'express';
import dotenv from "dotenv"

dotenv.config({ path: __dirname + '/.env' });
const app = express();

// Routes
app.get('/', (req: Request, res: Response) => {
  res.send('Hello, TypeScript with Express!');
});




app.listen(process.env.PORT || 4004, () => {
  console.log(`Server is running at http://localhost:${process.env.PORT?process.env.PORT:4004}`);
});
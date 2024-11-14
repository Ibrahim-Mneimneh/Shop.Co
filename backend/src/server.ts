import express, { Request, Response } from 'express';
import dotenv from "dotenv"

dotenv.config({ path: __dirname + '/.env' });
const app = express();
const PORT = process.env.PORT || 4004

// Routes
app.get('/', (req: Request, res: Response) => {
  res.send('Hello, TypeScript with Express!');
});

app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});
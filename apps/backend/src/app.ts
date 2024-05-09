import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

const app = express();

app.use(
  cors({
    origin: "*",
    credentials: true,
  }),
);

app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));
app.use(express.static(__dirname));
app.use(cookieParser());

//routes import
import userRoute from "./routes/user.routes";

//routes use
app.get("/", (req: express.Request, res: express.Response) => {
  return res.status(200).json({ message: "Running" });
});

app.use("/api/v1/users", userRoute);

export default app;

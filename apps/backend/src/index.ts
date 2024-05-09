import dotenv from "dotenv";
import path from "path";
import app from "./app";

dotenv.config({
  path: path.resolve("../../.env"),
});

import connectDb from "./db/connection";

connectDb()
  .then(() => {
    app.on("error", (error) => {
      console.log(error);
      throw error;
    });
    app.listen(process.env.PORT, () => {
      console.log(`server has started on port ${process.env.PORT}`);
    });
  })
  .catch((error) => console.log("db connection failed", error));

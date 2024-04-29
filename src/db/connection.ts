import mongoose from "mongoose";
import { DB_NAME } from "../constants";

const connectDb = async () => {
  try {
    const dbInstance = await mongoose.connect(
      `${process.env.MONGODB_URI}/${DB_NAME}`,
    );

    console.log(`\n MongoDB connected at HOST ${dbInstance.connection.host}`);
  } catch (error) {
    console.log("MONGODB Connection Failed ", error);
  }
};

export default connectDb;

import { v2 as cloudinary } from "cloudinary";
import fs from "fs";
import path from "path";

require("dotenv").config({
  path: path.resolve("../../.env"),
});

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export const uploadToCloudinary = async (localFilePath: any) => {
  try {
    if (!localFilePath) return null;

    const response = await cloudinary.uploader.upload(localFilePath);

    if (response) {
      fs.unlinkSync(localFilePath);
    }

    return response;
  } catch (error) {
    console.log(error);
    fs.unlinkSync(localFilePath);
    return null;
  }
};

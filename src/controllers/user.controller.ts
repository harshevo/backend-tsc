import express from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/ApiError";
import { User } from "../models/user.model";
import { uploadToCloudinary } from "../utils/cloudinary";
import { ApiResponse } from "../utils/ApiResponse";

const registerUser = asyncHandler(
  async (req: express.Request, res: express.Response) => {
    const { fullname, email, username, password } = req.body;

    if (
      [fullname, email, username, password].some(
        (field) => field?.trim() === "",
      )
    ) {
      throw new ApiError(400, "All Fields are required");
    }

    const existedUser = await User.findOne({
      $or: [{ username }, { email }],
    });

    if (existedUser) {
      throw new ApiError(409, "User Already Exists");
    }

    const avatarLocalPath = (
      req.files as { [fieldname: string]: Express.Multer.File[] }
    )?.avatar[0].path;

    const coverImageLocalPath = (
      req.files as { [fieldname: string]: Express.Multer.File[] }
    )?.coverImage[0].path;

    console.log("localpath", avatarLocalPath);

    if (!avatarLocalPath) {
      throw new ApiError(400, "Avatar File is Required");
    }

    const avatar = await uploadToCloudinary(avatarLocalPath);
    const coverImage = await uploadToCloudinary(coverImageLocalPath);

    if (!avatar) {
      throw new ApiError(400, "avatar is required");
    }

    console.log(avatar.secure_url);

    const user = await User.create({
      fullname,
      avatar: avatar.secure_url,
      coverImage: coverImage?.secure_url || "",
      email,
      password,
      username: username.toLowerCase(),
    });

    const createdUser = await User.findById(user._id).select(
      "-password -refreshToken",
    );

    return res
      .status(201)
      .json(new ApiResponse(200, createdUser, "User Registered Successfully"));
  },
);

export { registerUser };

import express from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/ApiError";
import { IUser, User } from "../models/user.model";
import { uploadToCloudinary } from "../utils/cloudinary";
import { ApiResponse } from "../utils/ApiResponse";
import mongoose from "mongoose";
import { Request, Response } from "express";
import { IRequestWithUser } from "../middlewares/auth.middleware";

const generateAccessAndRefreshTokens = async (
  userId: mongoose.Types.ObjectId,
) => {
  try {
    const user = await User.findById(userId);

    if (!user) {
      throw new ApiError(404, "User Not Found");
    }

    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(500, "something went wrong, --> TokenGeneration");
  }
};

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

    // const coverImageLocalPath = (
    //   req.files as { [fieldname: string]: Express.Multer.File[] }
    // )?.coverImage[0].path;

    let coverImageLocalPath;
    if (
      req.files &&
      Array.isArray(
        (req.files as { [fieldname: string]: Express.Multer.File[] })
          .coverImage,
      ) &&
      (req.files as { [fieldname: string]: Express.Multer.File[] }).coverImage
        .length > 0
    ) {
      coverImageLocalPath = (
        req.files as { [fieldname: string]: Express.Multer.File[] }
      )?.coverImage[0].path;
    }

    if (!avatarLocalPath) {
      throw new ApiError(400, "Avatar File is Required");
    }

    const avatar = await uploadToCloudinary(avatarLocalPath);
    const coverImage = await uploadToCloudinary(coverImageLocalPath);

    if (!avatar) {
      throw new ApiError(400, "avatar is required");
    }

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

const loginUser = asyncHandler(async (req: express.Request, res: Response) => {
  const { email, username, password } = req.body;

  debugger;

  if (!username || !email) {
    throw new ApiError(400, "username or password is required");
  }

  const user = await User.findOne({
    $or: [{ username }, { email }],
  });

  if (!user) {
    throw new ApiError(404, "user does not exist");
  }

  const isPasswordCorrect = await user.isPasswordCorrect(password);

  if (!isPasswordCorrect) {
    throw new ApiError(401, "password Incorrect");
  }

  const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
    user._id,
  );

  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken",
  );

  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        {
          user: loggedInUser,
          accessToken,
          refreshToken,
        },
        "User Logged in Successfully",
      ),
    );
});

const logoutUser = asyncHandler(async (req: Request, res: express.Response) => {
  try {
    await User.findByIdAndUpdate(
      (req.user as any)._id,
      {
        $set: {
          refreshToken: undefined,
        },
      },
      {
        new: true,
      },
    );

    const options = {
      httpOnly: true,
      secure: true,
    };

    return res
      .status(200)
      .clearCookie("accessToken", options)
      .clearCookie("refreshToken", options)
      .json({ message: "success" });
  } catch (error) {
    console.log(error);
    throw new ApiError(500, "Error during Logout");
  }
});

export { registerUser, loginUser, logoutUser };

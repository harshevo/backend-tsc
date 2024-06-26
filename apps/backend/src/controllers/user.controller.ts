import express from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/ApiError";
import { /*IUser,*/ User } from "../models/user.model";
import { uploadToCloudinary } from "../utils/cloudinary";
import { ApiResponse } from "../utils/ApiResponse";
import mongoose from "mongoose";
import { Request, Response } from "express";
// import { IRequestWithUser } from "../middlewares/auth.middleware";
import jwt from "jsonwebtoken";
import path from "path";
import { IDecodedToken } from "../middlewares/auth.middleware";

//imported here coz env file was not detected here
require("dotenv").config({
  path: path.resolve("../../.env"),
});

//options for sending secured cookie
const options = {
  httpOnly: true,
  secure: true,
};

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

    //finding user by username or email
    const existedUser = await User.findOne({
      $or: [{ username }, { email }],
    });

    if (existedUser) {
      throw new ApiError(409, "User Already Exists");
    }

    const avatarLocalPath = //typedef as below
      (req.files as { [fieldname: string]: Express.Multer.File[] })?.avatar[0]
        .path;

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

  if (!username || !email) {
    throw new ApiError(400, "username or password is required");
  }

  const user = await User.findOne({
    $or: [{ username }, { email }],
  });

  if (!user) {
    throw new ApiError(404, "user does not exist");
  }

  const isPasswordCorrect = await user.isPasswordCorrect(password as string);

  if (!isPasswordCorrect) {
    throw new ApiError(401, "password Incorrect");
  }

  const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
    user._id,
  );

  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken",
  );

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
      //IDecodedToken is an interface with user in it,
      //to support the user type in request
      (req.user as IDecodedToken)._id,
      {
        $set: {
          refreshToken: undefined,
        },
      },
      {
        new: true,
      },
    );

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

const refreshAccessToken = asyncHandler(async (req: Request, res: Response) => {
  try {
    //token may be in cookies or body
    const incomingToken = req.body.refreshToken || req.cookies.refreshToken;

    if (!incomingToken) {
      throw new ApiError(400, "UnAuthorized Access");
    }

    const decodedToken = jwt.verify(
      incomingToken,
      process.env.REFRESH_TOKEN_SECRET as string,
    );

    const user = await User.findById((decodedToken as IDecodedToken)._id);

    if (!user) {
      throw new ApiError(401, "Invalid AccessToken");
    }

    if (incomingToken !== user?.refreshToken) {
      throw new ApiError(401, "Invalid or Expired Token");
    }

    const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
      user?._id,
    );

    return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", refreshToken, options)
      .json({ message: "success" });
  } catch (error) {
    console.log("refreshAccessToken", error);
    throw new ApiError(500, "Error in Refreshing Access Token");
  }
});

const resetPassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body;

  const user = await User.findById((req.user as IDecodedToken)?._id);

  if (!user) {
    throw new ApiError(401, "UnAuthorized");
  }

  const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);

  if (!isPasswordCorrect) {
    throw new ApiError(401, "Invalid Old Password");
  }

  user.password = newPassword;

  //no need to validate the data before saving
  await user.save({ validateBeforeSave: false });

  return res.status(200).json({ message: "Password Changed Successfully" });
});

const getCurrentUser = asyncHandler(async (req: Request, res: Response) => {
  return res.status(200).json(req.user);
});

const updateUser = asyncHandler(async (req: Request, res: Response) => {
  try {
    const { fullname } = req.body;

    if (!fullname) {
      throw new ApiError(400, "Enter Valid Fields");
    }

    const user = await User.findByIdAndUpdate(
      (req.user as IDecodedToken)?._id,
      {
        $set: {
          fullname,
        },
      },
      { new: true },
    ).select("-password");

    return res.status(200).json(user);
  } catch (error) {
    console.log(error);
    throw new ApiError(500, "something went wrong while updating user");
  }
});

const updateUserAvatar = asyncHandler(async (req, res) => {
  try {
    const avtarLocalPath = req.file?.path;

    if (!avtarLocalPath) {
      throw new ApiError(404, "avtar is required");
    }

    const avatar = await uploadToCloudinary(avtarLocalPath);

    if (!avatar) {
      throw new ApiError(404, "avatarurl not found: inside updateAvatar");
    }

    const user = await User.findByIdAndUpdate(
      (req.user as IDecodedToken)?._id,
      {
        $set: {
          avatar: avatar?.url,
        },
      },
      { new: true },
    ).select("-password");

    return res.status(200).json(user);
  } catch (error) {
    console.log("updateAvatarImage--> controller", error);
    throw new ApiError(500, "Error while updating the userAvatar");
  }
});

const updateUserCoverImage = asyncHandler(async (req, res) => {
  try {
    const coverImagePath = req.file?.path;

    if (!coverImagePath) {
      throw new ApiError(404, "coverImage is required");
    }

    const coverImageUrl = await uploadToCloudinary(coverImagePath);

    if (!coverImageUrl) {
      throw new ApiError(404, "coverImageUrl not found: inside updateAvatar");
    }

    const user = await User.findByIdAndUpdate(
      (req.user as IDecodedToken)?._id,
      {
        $set: {
          coverImage: coverImageUrl?.url,
        },
      },
      { new: true },
    ).select("-password");

    return res.status(200).json(user);
  } catch (error) {
    console.log("updateCoverImage--> controller", error);
    throw new ApiError(500, "Error while updating the user coverImage");
  }
});

export {
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  resetPassword,
  updateUser,
  getCurrentUser,
  updateUserAvatar,
  updateUserCoverImage,
};

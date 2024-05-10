import { ApiError } from "../utils/ApiError";
import { asyncHandler } from "../utils/asyncHandler";
import jwt from "jsonwebtoken";
import { User, IUser } from "../models/user.model";
import mongoose from "mongoose";
import { Express, NextFunction, Request, Response } from "express";

export interface IDecodedToken {
  //can be named custom User Interface
  _id: mongoose.Types.ObjectId;
}

export interface IRequestWithUser extends Request {
  user?: string;
  _id?: mongoose.Types.ObjectId;
}

export const verifyJwt = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const token =
        req.cookies?.accessToken ||
        req.header("Authorization")?.replace("Bearer ", "");

      if (!token) {
        throw new ApiError(401, "Unauthorized request");
      }

      const decodedToken = jwt.verify(
        token,
        process.env.ACCESS_TOKEN_SECRET as string,
      );

      const user = await User.findById(
        (decodedToken as IDecodedToken)._id,
      ).select("-password -refreshToken");

      if (!user) {
        throw new ApiError(401, "Invalid Access Token");
      }

      req.user = user;

      next();
    } catch (error) {
      console.log("auth.middleware.ts", error);
      throw new ApiError(401, "Invalid Access Token");
      next();
    }
  },
);

import { Router } from "express";

import { upload } from "../middlewares/multer.middleware";
import {
  loginUser,
  logoutUser,
  registerUser,
  refreshAccessToken,
  resetPassword,
} from "../controllers/user.controller";
import { verifyJwt } from "../middlewares/auth.middleware";

const router = Router();

router.post(
  "/register",
  upload.fields([
    { name: "avatar", maxCount: 1 },
    { name: "coverImage", maxCount: 1 },
  ]),
  registerUser,
);

router.post("/login", loginUser);

//secured routes
router.get("/logout", verifyJwt, logoutUser);
router.get("/refresh-session", refreshAccessToken);
router.post("/reset-password", verifyJwt, resetPassword);

export default router;

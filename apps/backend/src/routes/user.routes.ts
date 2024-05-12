import { Router } from "express";

import { upload } from "../middlewares/multer.middleware";
import {
  loginUser,
  logoutUser,
  registerUser,
  refreshAccessToken,
  resetPassword,
  updateUser,
  getCurrentUser,
  updateUserAvatar,
  updateUserCoverImage,
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
router.get("/getusers", verifyJwt, getCurrentUser);
router.post("/updateuser", verifyJwt, updateUser);
router.post(
  "/update_avatar",
  verifyJwt,
  upload.single("avatar"),
  updateUserAvatar,
);
router.post(
  "/update_Cover_image",
  verifyJwt,
  upload.single("coverImage"),
  updateUserCoverImage,
);
export default router;

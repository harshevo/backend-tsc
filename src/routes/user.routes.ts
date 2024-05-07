import { Router } from "express";

import { upload } from "../middlewares/multer.middleware";
import { registerUser } from "../controllers/user.controller";

const router = Router();

router.post(
  "/register",
  upload.fields([
    { name: "avatar", maxCount: 1 },
    { name: "coverImage", maxCount: 1 },
  ]),
  registerUser,
);

export default router;

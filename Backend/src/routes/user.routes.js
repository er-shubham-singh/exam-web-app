import express from 'express'
import { bulkRegisterController, loginController, registerUserController } from '../Controller/user.controller.js';

const router = express.Router()

router.post("/users/register", registerUserController);
router.post("/user/login", loginController)
router.post("/users/bulk", bulkRegisterController);

export default router
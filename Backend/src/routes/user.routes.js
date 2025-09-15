import express from 'express'
import { loginController, registerUserController } from '../Controller/user.controller.js';

const router = express.Router()

router.post("/users/register", registerUserController);
router.post("/user/login", loginController)

export default router
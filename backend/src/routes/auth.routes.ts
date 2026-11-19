/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Router } from 'express';
import { authController } from '../controllers/auth.controller.js';
import { validate } from '../middleware/validate.js';
import { loginSchema } from '../validators/auth.validator.js';
import { authenticate } from '../middleware/authenticate.js';

export const authRouter = Router();

// POST /api/auth/login
authRouter.post('/login', validate({ body: loginSchema }), (req, res, next) =>
  authController.login(req, res, next)
);

// GET /api/auth/me
authRouter.get('/me', authenticate, (req, res, next) =>
  authController.getMe(req, res, next)
);

// POST /api/auth/logout
authRouter.post('/logout', authenticate, (req, res, next) =>
  authController.logout(req, res, next)
);

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Request, Response } from 'express';

export const getHealth = (_req: Request, res: Response): void => {
  res.status(200).json({
    success: true,
    message: 'RestoControl API is running',
    timestamp: new Date().toISOString(),
  });
};


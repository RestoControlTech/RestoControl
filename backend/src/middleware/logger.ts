/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import morgan from 'morgan';
import { Request, Response } from 'express';
import { config } from '../config/index.js';

export const requestLogger = morgan(config.isProduction ? 'combined' : 'dev', {
  skip: (_req: Request, _res: Response) => config.isTest,
});


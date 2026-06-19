import { Request, Response, NextFunction } from 'express';
import { env } from '../config/env';

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  console.error('[ErrorHandler] Error caught:', err);
  res.status(statusCode).json({
    message: err.message || 'Internal Server Error',
    stack: env.NODE_ENV === 'production' ? undefined : err.stack,
  });
};

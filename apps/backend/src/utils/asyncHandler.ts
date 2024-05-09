import express from "express";

export const asyncHandler = (requestHandler: express.RequestHandler) => {
  return async (
    req: express.Request,
    res: express.Response,
    next: express.NextFunction,
  ) => {
    return Promise.resolve(requestHandler(req, res, next)).catch((err) =>
      next(err),
    );
  };
};

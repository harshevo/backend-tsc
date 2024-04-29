import express from "express";

export const asyncHandler = (requestHandler: express.RequestHandler) => {
  return (
    req: express.Request,
    res: express.Response,
    next: express.NextFunction,
  ) => {
    Promise.resolve(requestHandler(req, res, next)).catch((err) => next(err));
  };
};

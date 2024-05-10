export * as express from "express";

declare global {
  namespace express {
    export interface Request {
      user?: string;
    }
  }
}

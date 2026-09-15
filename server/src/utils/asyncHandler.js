/**
 * Express 4 does not catch rejections from async handlers — an unhandled one
 * hangs the request until it times out, with no error response and no log line.
 * Every async route goes through this so failures reach the error handler.
 */
export const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next)

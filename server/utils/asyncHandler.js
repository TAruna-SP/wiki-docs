// Wrap an async Express handler so thrown errors / rejections reach next().
export const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

export default asyncHandler;

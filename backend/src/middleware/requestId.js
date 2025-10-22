export function requestId(req,res,next){ const h = req.headers["x-request-id"]; req.requestId = h || Math.random().toString(36).slice(2); res.setHeader("x-request-id", req.requestId); next(); }

import jwt from 'jsonwebtoken';

export const requireAuth = (req, _res, next) => {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return next({ status: 401, message: 'Unauthorized' });
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload;
    next();
  } catch {
    next({ status: 401, message: 'Invalid token' });
  }
};

export const requireAdmin = (req, _res, next) => {
  if (req.user?.role !== 'admin') return next({ status: 403, message: 'Forbidden' });
  next();
};

import * as authService from '../services/authService.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const ua = (req) => req.headers['user-agent'];

export const register = asyncHandler(async (req, res) => {
  const result = await authService.register(req.body, ua(req));
  res.status(201).json(result);
});

export const login = asyncHandler(async (req, res) => {
  const result = await authService.login(req.body, ua(req));
  res.json(result);
});

export const refresh = asyncHandler(async (req, res) => {
  const token = req.body?.refreshToken;
  const result = await authService.refresh(token, ua(req));
  res.json(result);
});

export const logout = asyncHandler(async (req, res) => {
  await authService.logout(req.body?.refreshToken);
  res.json({ ok: true });
});

export const me = asyncHandler(async (req, res) => {
  res.json({ user: req.user.toJSON() });
});

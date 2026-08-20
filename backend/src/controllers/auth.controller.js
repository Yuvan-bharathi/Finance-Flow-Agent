import { loginUser, getCurrentUser, getAllUsers, createUserInvitation, setInitialUserPassword } from '../services/auth.service.js';
import { setAuthCookie, clearAuthCookie } from '../utils/tokenHelper.js';
import { sendSuccessResponse } from '../utils/apiResponse.js';

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both email and password.'
      });
    }

    const { user, token } = await loginUser(email, password);

    setAuthCookie(res, token);

    return sendSuccessResponse(res, 200, 'Login successful', {
      user,
      token
    });
  } catch (error) {
    return next(error);
  }
};

export const logout = async (req, res, next) => {
  try {
    clearAuthCookie(res);
    return sendSuccessResponse(res, 200, 'Logout successful', null);
  } catch (error) {
    return next(error);
  }
};

export const getMe = async (req, res, next) => {
  try {
    const user = await getCurrentUser(req.user.id);
    return sendSuccessResponse(res, 200, 'User profile retrieved successfully', { user });
  } catch (error) {
    return next(error);
  }
};

export const getUsers = async (req, res, next) => {
  try {
    const users = await getAllUsers();
    return sendSuccessResponse(res, 200, 'Users list retrieved successfully', { users });
  } catch (error) {
    return next(error);
  }
};

export const createUser = async (req, res, next) => {
  try {
    const { name, email, role } = req.body;
    if (!name || !email || !role) {
      return res.status(400).json({
        success: false,
        message: 'Please provide User Name, Email Address, and Role.'
      });
    }

    const result = await createUserInvitation(req.user, { name, email, roleName: role });
    return sendSuccessResponse(res, 201, `User '${name}' created successfully. Password creation link generated.`, {
      user: result
    });
  } catch (error) {
    return next(error);
  }
};

export const setPassword = async (req, res, next) => {
  try {
    const { email, token, password } = req.body;
    if (!email || !token || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide Email, Token, and New Password.'
      });
    }

    const result = await setInitialUserPassword({ email, token, password });
    return sendSuccessResponse(res, 200, result.message, result);
  } catch (error) {
    return next(error);
  }
};

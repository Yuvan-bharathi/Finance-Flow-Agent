import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import pool from '../config/db.js';
import { config } from '../config/env.js';
import { findUserByEmail, findUserById, updateLastLogin } from '../models/user.model.js';
import { generateToken } from '../utils/tokenHelper.js';
import { sendUserInvitationEmail } from '../utils/emailService.js';

/**
 * Service: Authentication Service
 * Encapsulates login, user management, hierarchical invitation token generation, and password setup.
 */

export const loginUser = async (email, password) => {
  const user = await findUserByEmail(email);
  if (!user) {
    const error = new Error('Invalid email or password.');
    error.statusCode = 401;
    throw error;
  }

  if (!user.is_active) {
    const error = new Error('Account is deactivated. Please contact your system administrator.');
    error.statusCode = 403;
    throw error;
  }

  const isMatch = await bcrypt.compare(password, user.password_hash);
  if (!isMatch) {
    const error = new Error('Invalid email or password.');
    error.statusCode = 401;
    throw error;
  }

  await updateLastLogin(user.id);

  const payload = {
    id: user.id,
    name: user.name,
    email: user.email,
    role_id: user.role_id,
    role_name: user.role_name
  };

  const token = generateToken(payload);

  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role_id: user.role_id,
      role_name: user.role_name
    },
    token
  };
};

export const getCurrentUser = async (userId) => {
  const user = await findUserById(userId);
  if (!user) {
    const error = new Error('User account not found.');
    error.statusCode = 404;
    throw error;
  }
  return user;
};

export const getAllUsers = async () => {
  const [rows] = await pool.query(`
    SELECT u.id, u.name, u.email, u.is_active, u.role_id, r.name as role_name, u.created_at, u.last_login_at
    FROM users u
    JOIN roles r ON u.role_id = r.id
    ORDER BY u.id DESC;
  `);
  return rows;
};

export const createUserInvitation = async (creatorUser, { name, email, roleName }) => {
  const creatorRole = creatorUser.role_name || creatorUser.role;

  const isSuperAdminOrOwner = creatorRole === 'super_admin' || creatorRole === 'owner';
  const isAdmin = creatorRole === 'admin';

  if (!isSuperAdminOrOwner && !isAdmin) {
    const err = new Error('Permission denied. Only Admins and Super Admins can create new user accounts.');
    err.statusCode = 403;
    throw err;
  }

  if (isAdmin && (roleName === 'super_admin' || roleName === 'owner' || roleName === 'admin')) {
    const err = new Error(`Admins can only create Manager, Accountant, or Viewer accounts. Creating '${roleName}' requires Super Admin privileges.`);
    err.statusCode = 403;
    throw err;
  }

  const existingUser = await findUserByEmail(email);
  if (existingUser) {
    const err = new Error(`User with email '${email}' is already registered.`);
    err.statusCode = 400;
    throw err;
  }

  const [roleRows] = await pool.query(`SELECT id FROM roles WHERE name = ?`, [roleName]);
  if (roleRows.length === 0) {
    const err = new Error(`Role '${roleName}' is invalid.`);
    err.statusCode = 400;
    throw err;
  }
  const roleId = roleRows[0].id;

  const resetToken = crypto.randomBytes(32).toString('hex');
  const tokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

  const initialDummyHash = await bcrypt.hash(crypto.randomBytes(16).toString('hex'), 10);

  const [insertRes] = await pool.execute(
    `INSERT INTO users (role_id, name, email, password_hash, is_active, reset_token, reset_token_expires)
     VALUES (?, ?, ?, ?, 1, ?, ?);`,
    [roleId, name, email, initialDummyHash, resetToken, tokenExpires]
  );

  const baseUrl = config.cors.clientUrl || 'http://localhost:5173';
  const invitationUrl = `${baseUrl}/set-password?token=${resetToken}&email=${encodeURIComponent(email)}`;

  // Dispatch Invitation Email via Nodemailer / Email Service
  const emailResult = await sendUserInvitationEmail({
    email,
    name,
    roleName,
    invitationUrl
  });

  return {
    id: insertRes.insertId,
    name,
    email,
    role_name: roleName,
    invitation_url: invitationUrl,
    reset_token: resetToken,
    expires_at: tokenExpires,
    email_delivery: emailResult
  };
};

export const setInitialUserPassword = async ({ email, token, password }) => {
  const [userRows] = await pool.query(
    `SELECT * FROM users WHERE email = ? AND reset_token = ? AND reset_token_expires > NOW();`,
    [email, token]
  );

  if (userRows.length === 0) {
    const err = new Error('Invalid or expired password invitation token. Please request a new invitation.');
    err.statusCode = 400;
    throw err;
  }

  const user = userRows[0];
  const newHash = await bcrypt.hash(password, 10);

  await pool.execute(
    `UPDATE users SET password_hash = ?, reset_token = NULL, reset_token_expires = NULL, is_active = 1 WHERE id = ?;`,
    [newHash, user.id]
  );

  return {
    success: true,
    message: `Password set successfully for ${user.email}. You may now sign in.`
  };
};

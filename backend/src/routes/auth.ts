import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { query, getClient } from '../config/db';

const router = Router();

const resetTokens = new Map<
  string,
  { userId: string; expiresAt: number }
>();

const createToken = (user: any) =>
  jwt.sign(
    {
      id: user.id,
      restaurantId: user.restaurant_id,
      role: user.role
    },
    process.env.JWT_SECRET!,
    { expiresIn: '7d' }
  );

router.post('/register', async (req, res) => {
  const client = await getClient();

  try {
    const {
      restaurantName,
      name,
      email,
      phone,
      password
    } = req.body;

    if (!restaurantName || !name || !email || !password) {
      return res.status(400).json({
        message:
          'Restaurant name, name, email and password are required'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        message: 'Password must be at least 6 characters'
      });
    }

    const normalizedEmail = String(email)
      .trim()
      .toLowerCase();

    const exists = await client.query(
      'SELECT id FROM users WHERE email=$1',
      [normalizedEmail]
    );

    if (exists.rowCount) {
      return res.status(409).json({
        message: 'Email already exists'
      });
    }

    const restaurantId = crypto.randomUUID();
    const userId = crypto.randomUUID();

    await client.query('BEGIN');

    await client.query(
      'INSERT INTO restaurants(id,name,phone) VALUES($1,$2,$3)',
      [
        restaurantId,
        restaurantName,
        phone || null
      ]
    );

    const hash = await bcrypt.hash(password, 10);

    const user = (
      await client.query(
        `INSERT INTO users(
          id,
          restaurant_id,
          name,
          email,
          password,
          role
        )
        VALUES($1,$2,$3,$4,$5,'restaurant_admin')
        RETURNING id,restaurant_id,name,email,role`,
        [
          userId,
          restaurantId,
          name,
          normalizedEmail,
          hash
        ]
      )
    ).rows[0];

    await client.query('COMMIT');

    return res.status(201).json({
      token: createToken(user),
      user: {
        name: user.name,
        email: user.email,
        restaurantId: user.restaurant_id,
        role: user.role
      }
    });
  } catch (e) {
    try {
      await client.query('ROLLBACK');
    } catch {}

    return res.status(500).json({
      message: 'Registration failed'
    });
  } finally {
    client.release();
  }
});

router.post('/login', async (req, res) => {
  try {
    const email = String(req.body.email || '')
      .trim()
      .toLowerCase();

    const user = (
      await query(
        `SELECT
          id,
          restaurant_id,
          name,
          email,
          password,
          role
        FROM users
        WHERE email=$1`,
        [email]
      )
    ).rows[0];

    if (
      !user ||
      !(await bcrypt.compare(
        req.body.password || '',
        user.password
      ))
    ) {
      return res.status(401).json({
        message: 'Invalid email or password'
      });
    }

    return res.json({
      token: createToken(user),
      user: {
        name: user.name,
        email: user.email,
        restaurantId: user.restaurant_id,
        role: user.role
      }
    });
  } catch {
    return res.status(500).json({
      message: 'Login failed'
    });
  }
});

router.post('/forgot-password', async (req, res) => {
  try {
    const email = String(req.body.email || '')
      .trim()
      .toLowerCase();

    const user = (
      await query(
        'SELECT id FROM users WHERE email=$1',
        [email]
      )
    ).rows[0];

    if (!user) {
      return res.status(404).json({
        message:
          'No account found with this email'
      });
    }

    const token = crypto
      .randomBytes(32)
      .toString('hex');

    resetTokens.set(token, {
      userId: user.id,
      expiresAt:
        Date.now() + 15 * 60 * 1000
    });

    if (process.env.NODE_ENV !== 'production') {
      return res.json({
        message: 'Reset request created',
        resetToken: token
      });
    }

    return res.json({
      message:
        'If the account exists, a reset link has been sent.'
    });
  } catch {
    return res.status(500).json({
      message: 'Password recovery failed'
    });
  }
});

router.post('/reset-password', async (req, res) => {
  try {
    const { token, password } = req.body;

    if (
      !token ||
      !password ||
      password.length < 6
    ) {
      return res.status(400).json({
        message:
          'Valid token and password of at least 6 characters are required'
      });
    }

    const data = resetTokens.get(token);

    if (
      !data ||
      data.expiresAt < Date.now()
    ) {
      resetTokens.delete(token);

      return res.status(400).json({
        message:
          'Invalid or expired reset token'
      });
    }

    const hash = await bcrypt.hash(password, 10);

    await query(
      `UPDATE users
       SET password=$1,updated_at=NOW()
       WHERE id=$2`,
      [hash, data.userId]
    );

    resetTokens.delete(token);

    return res.json({
      message:
        'Password updated successfully'
    });
  } catch {
    return res.status(500).json({
      message: 'Password reset failed'
    });
  }
});

export default router;
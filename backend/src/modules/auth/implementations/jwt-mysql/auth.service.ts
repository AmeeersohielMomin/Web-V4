import mysql from 'mysql2/promise';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import type { SignOptions } from 'jsonwebtoken';

// MySQL User model
interface User {
  id: number;
  email: string;
  password: string;
  created_at: Date;
  updated_at: Date;
}

// Database connection pool
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'auth_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Initialize users table
export const initializeDatabase = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ MySQL users table initialized');
  } catch (error) {
    console.error('❌ Error initializing database:', error);
    throw error;
  }
};

export class AuthService {
  async signup(email: string, password: string) {
    const connection = await pool.getConnection();
    try {
      // Check if user exists
      const [existingUsers] = await connection.query<any[]>(
        'SELECT * FROM users WHERE email = ?',
        [email.toLowerCase()]
      );

      if (existingUsers.length > 0) {
        throw new Error('User already exists');
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create user
      const [result] = await connection.query<any>(
        'INSERT INTO users (email, password) VALUES (?, ?)',
        [email.toLowerCase(), hashedPassword]
      );

      const userId = result.insertId;

      // Generate JWT
      const signOptions: SignOptions = { expiresIn: '7d' };
      const token = jwt.sign(
        { userId, email: email.toLowerCase() },
        process.env.JWT_SECRET || 'your-secret-key',
        signOptions
      );

      return {
        user: { id: userId, email: email.toLowerCase() },
        token
      };
    } finally {
      connection.release();
    }
  }

  async login(email: string, password: string) {
    const connection = await pool.getConnection();
    try {
      // Find user
      const [users] = await connection.query<any[]>(
        'SELECT * FROM users WHERE email = ?',
        [email.toLowerCase()]
      );

      if (users.length === 0) {
        throw new Error('Invalid credentials');
      }

      const user = users[0];

      // Verify password
      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        throw new Error('Invalid credentials');
      }

      // Generate JWT
      const signOptions: SignOptions = { expiresIn: '7d' };
      const token = jwt.sign(
        { userId: user.id, email: user.email },
        process.env.JWT_SECRET || 'your-secret-key',
        signOptions
      );

      return {
        user: { id: user.id, email: user.email },
        token
      };
    } finally {
      connection.release();
    }
  }

  async verifyToken(token: string) {
    try {
      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || 'your-secret-key'
      ) as { userId: number; email: string };
      return decoded;
    } catch (error) {
      throw new Error('Invalid or expired token');
    }
  }

  async getUserById(userId: number) {
    const connection = await pool.getConnection();
    try {
      const [users] = await connection.query<any[]>(
        'SELECT id, email, created_at FROM users WHERE id = ?',
        [userId]
      );

      if (users.length === 0) {
        throw new Error('User not found');
      }

      return users[0];
    } finally {
      connection.release();
    }
  }
}

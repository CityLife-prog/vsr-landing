// Demo Authentication Service for Testing
// WARNING: This is for development/demo purposes only - DELETE before production

import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

interface DemoUser {
  id: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: 'admin' | 'employee' | 'client';
  phone?: string;
  employeeId?: string;
  projectIds?: string[];
  status?: 'active' | 'pending' | 'inactive';
}

interface LoginResult {
  success: boolean;
  token?: string;
  user?: any;
  message?: string;
}

export class DemoAuthService {
  private readonly JWT_SECRET = process.env.JWT_SECRET || 'demo-secret-key';
  private readonly DEMO_PASSWORD = 'demo123'; // Simple password for all demo accounts

  // Demo users - v2 has minimal accounts (demo admin + 3 real accounts)
  private demoUsers: DemoUser[] = [
    // Demo Admin User (for portal login and testing)
    {
      id: 'admin-demo-001',
      email: 'demo.admin@vsrsnow.com',
      password: this.DEMO_PASSWORD,
      firstName: 'Demo',
      lastName: 'Administrator',
      role: 'admin',
      status: 'active'
    },
    // Real Admin Users (v2 includes these 3 accounts)
    {
      id: 'admin-marcus',
      email: 'marcus@vsrsnow.com',
      password: 'demo123',
      firstName: 'Marcus',
      lastName: 'VSR',
      role: 'admin',
      status: 'active'
    },
    {
      id: 'admin-zack',
      email: 'zack@vsrsnow.com',
      password: 'demo123',
      firstName: 'Zack',
      lastName: 'VSR',
      role: 'admin',
      status: 'active'
    },
    {
      id: 'admin-citylife32',
      email: 'citylife32@outlook.com',
      password: 'demo123',
      firstName: 'Development',
      lastName: 'Admin',
      role: 'admin',
      status: 'active'
    }
  ];

  /**
   * Demo login for any user type
   */
  async demoLogin(role: 'admin' | 'employee' | 'client'): Promise<LoginResult> {
    const user = this.demoUsers.find(u => u.role === role);
    
    if (!user) {
      return {
        success: false,
        message: 'Demo user not found'
      };
    }

    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName
      },
      this.JWT_SECRET,
      { expiresIn: '24h' }
    );

    return {
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        phone: user.phone,
        employeeId: user.employeeId,
        projectIds: user.projectIds,
        status: user.status
      },
      message: 'Demo login successful'
    };
  }

  /**
   * Regular login with credentials
   */
  async login(email: string, password: string): Promise<LoginResult> {
    const user = this.demoUsers.find(u => u.email === email);
    
    if (!user) {
      return {
        success: false,
        message: 'Invalid email or password'
      };
    }

    // Check password (simple comparison for demo)
    if (password !== user.password) {
      return {
        success: false,
        message: 'Invalid email or password'
      };
    }

    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName
      },
      this.JWT_SECRET,
      { expiresIn: '24h' }
    );

    return {
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        phone: user.phone,
        employeeId: user.employeeId,
        projectIds: user.projectIds,
        status: user.status
      },
      message: 'Login successful'
    };
  }

  /**
   * Verify token and get user info
   */
  async verifyToken(token: string): Promise<any> {
    try {
      const decoded = jwt.verify(token, this.JWT_SECRET) as any;
      const user = this.demoUsers.find(u => u.id === decoded.userId);
      
      if (!user) {
        return null;
      }

      return {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        phone: user.phone,
        employeeId: user.employeeId,
        projectIds: user.projectIds,
        status: user.status
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * Get demo user credentials for display (v2 only shows admin)
   */
  getDemoCredentials(): { [key: string]: { email: string; password: string } } {
    return {
      admin: {
        email: 'demo.admin@vsrsnow.com',
        password: this.DEMO_PASSWORD
      }
    };
  }

  /**
   * Get all users (for user management)
   */
  getAllUsers(): DemoUser[] {
    return this.demoUsers.map(user => ({
      ...user,
      password: '[HIDDEN]' // Don't expose passwords
    }));
  }

  /**
   * Get users by role
   */
  getUsersByRole(role: 'admin' | 'employee' | 'client'): DemoUser[] {
    return this.demoUsers.filter(user => user.role === role).map(user => ({
      ...user,
      password: '[HIDDEN]' // Don't expose passwords
    }));
  }
}

// Export singleton instance
export const demoAuthService = new DemoAuthService();
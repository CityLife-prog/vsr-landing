/**
 * Employee Email Verification API Endpoint
 * Handle email verification for employee accounts
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { EmployeeAccountService } from '../../../services/EmployeeAccountService';

const employeeService = new EmployeeAccountService();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: `Method ${req.method} not allowed` });
  }

  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ 
        error: 'Verification token is required' 
      });
    }

    // Verify the email
    const employee = await employeeService.verifyEmployeeEmail(token);

    if (!employee) {
      return res.status(400).json({ 
        error: 'Invalid or expired verification token' 
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Email verified successfully. Your account is now pending admin approval.',
      employee: {
        id: employee.id,
        email: employee.email,
        firstName: employee.firstName,
        lastName: employee.lastName,
        employeeId: employee.employeeId,
        department: employee.department,
        position: employee.position,
        status: employee.status,
        verificationStatus: employee.verificationStatus
      }
    });
  } catch (error) {
    console.error('Email verification error:', error);
    
    if (error instanceof Error) {
      return res.status(400).json({ 
        error: error.message 
      });
    }

    return res.status(500).json({ 
      error: 'Internal server error during verification'
    });
  }
}
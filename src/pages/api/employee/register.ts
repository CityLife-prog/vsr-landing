/**
 * Employee Registration API Endpoint
 * Handle new employee account registrations
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { EmployeeAccountService, EmployeeRegistrationData } from '../../../services/EmployeeAccountService';

const employeeService = new EmployeeAccountService();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: `Method ${req.method} not allowed` });
  }

  try {
    const registrationData: EmployeeRegistrationData = req.body;

    // Validate required fields
    const errors: Record<string, string> = {};

    if (!registrationData.email) {
      errors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(registrationData.email)) {
      errors.email = 'Email is invalid';
    }

    if (!registrationData.firstName) errors.firstName = 'First name is required';
    if (!registrationData.lastName) errors.lastName = 'Last name is required';
    if (!registrationData.employeeId) errors.employeeId = 'Employee ID is required';
    if (!registrationData.department) errors.department = 'Department is required';
    if (!registrationData.position) errors.position = 'Position is required';
    if (!registrationData.hireDate) errors.hireDate = 'Hire date is required';

    // Check for existing employee ID and email
    const existingEmail = await employeeService.employeeEmailExists(registrationData.email);
    if (existingEmail) {
      errors.email = 'This email address is already registered';
    }

    const existingId = await employeeService.employeeIdExists(registrationData.employeeId);
    if (existingId) {
      errors.employeeId = 'This employee ID already exists';
    }

    if (Object.keys(errors).length > 0) {
      return res.status(400).json({ error: 'Validation failed', errors });
    }

    // Register the employee
    const result = await employeeService.registerEmployee(registrationData);

    return res.status(201).json({
      success: true,
      message: 'Employee registration submitted successfully',
      employee: {
        id: result.employee.id,
        email: result.employee.email,
        firstName: result.employee.firstName,
        lastName: result.employee.lastName,
        employeeId: result.employee.employeeId,
        department: result.employee.department,
        position: result.employee.position,
        status: result.employee.status,
        verificationStatus: result.employee.verificationStatus
      }
    });
  } catch (error) {
    console.error('Employee registration error:', error);
    
    if (error instanceof Error) {
      return res.status(400).json({ 
        error: error.message 
      });
    }

    return res.status(500).json({ 
      error: 'Internal server error during registration'
    });
  }
}
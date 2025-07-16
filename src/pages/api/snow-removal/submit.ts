import { NextApiRequest, NextApiResponse } from 'next';
import { simpleAuthService } from '@/services/SimpleAuthService';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    
    // Verify the token
    const user = await simpleAuthService.verifyToken(token);
    if (!user || (user.role !== 'employee' && user.role !== 'admin')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const {
      propertyCode,
      clientName,
      serviceAddress,
      zipcode,
      serviceType,
      priority,
      scheduledDate,
      estimatedHours,
      specialInstructions,
      equipmentRequired,
      weatherConditions,
      accessNotes,
      submittedBy,
      submittedAt
    } = req.body;

    // Validate required fields
    if (!propertyCode || !clientName || !serviceAddress || !zipcode || !scheduledDate) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // In a real implementation, you would:
    // 1. Store this data in a database
    // 2. Generate Excel file automatically
    // 3. Send notifications to admin dashboard
    // 4. Integrate with scheduling system

    // For now, we'll simulate storing the data
    const snowRemovalRequest = {
      id: Date.now().toString(),
      propertyCode,
      clientName,
      serviceAddress,
      zipcode,
      serviceType,
      priority,
      scheduledDate,
      estimatedHours,
      specialInstructions,
      equipmentRequired,
      weatherConditions,
      accessNotes,
      submittedBy,
      submittedAt,
      status: 'pending',
      createdAt: new Date().toISOString()
    };

    // Store in localStorage for demo purposes (in production, use a database)
    // This would normally be saved to a database like PostgreSQL, MongoDB, etc.
    console.log('Snow Removal Request Submitted:', snowRemovalRequest);

    // In production, you would also:
    // - Send email notification to admin
    // - Update admin dashboard with new request
    // - Log the activity for audit trail
    // - Generate automatic Excel report

    res.status(200).json({ 
      success: true, 
      message: 'Snow removal request submitted successfully',
      requestId: snowRemovalRequest.id
    });

  } catch (error) {
    console.error('Snow removal submission error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
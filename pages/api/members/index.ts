import { NextApiRequest, NextApiResponse } from 'next';
import db from '@/lib/db-firebase';
import { initializeFirestore } from '@/lib/firestore-init';

  // GET all members
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Initialize Firestore server-side before operations
  try {
    const initialized = await initializeFirestore();
    if (!initialized) {
      console.error('⚠️ [API] Firestore initialization returned false');
    }
  } catch (error: any) {
    console.error('❌ [API] Firestore initialization failed:', {
      message: error?.message,
      code: error?.code,
      name: error?.name
    });
    // Return error immediately if initialization fails
    return res.status(500).json({
      error: 'Firestore initialization failed',
      details: error?.message || 'Unknown error',
      code: error?.code || 'INIT_ERROR',
      hint: 'Check Firebase configuration and security rules'
    });
  }

  if (req.method === 'GET') {
    try {
      const members = await db.getMembers();
      return res.status(200).json(members);
    } catch (error: any) {
      console.error('Error fetching members:', error);
      // Return more detailed error for debugging
      return res.status(500).json({ 
        error: 'Failed to fetch members',
        details: error?.message || 'Unknown error',
        code: error?.code || 'UNKNOWN'
      });
    }
  }

  // POST create new member
  if (req.method === 'POST') {
    try {
      console.log('📝 [API] Creating member - Request body:', JSON.stringify(req.body));
      
      const {
        name,
        alias_name,
        village,
        town,
        percentage_of_return,
        referral_name,
        referral_percent,
        deposit_amount,
        investment_date,
        mode_of_payment
      } = req.body;

      if (!name || !percentage_of_return) {
        console.error('❌ [API] Validation failed - missing name or percentage');
        return res.status(400).json({ error: 'Name and percentage of return are required' });
      }

      console.log('✅ [API] Validation passed, creating member...');

      // Create member (date_of_return defaults to 30 if not provided)
      let member;
      try {
        member = await db.createMember({
          name,
          alias_name,
          village,
          town,
          percentage_of_return,
          date_of_return: 30, // Default to 30 days
          referral_name,
          referral_percent
        });
        console.log('✅ [API] Member created successfully:', member.id);
      } catch (memberError: any) {
        console.error('❌ [API] Error in db.createMember:', {
          message: memberError?.message,
          code: memberError?.code,
          name: memberError?.name,
          stack: memberError?.stack?.substring(0, 300)
        });
        throw memberError;
      }

      // If deposit details provided, create initial deposit
      if (deposit_amount && investment_date && mode_of_payment) {
        try {
          console.log('💰 [API] Creating initial deposit...');
          await db.createDeposit({
            member_id: member.id,
            amount: deposit_amount,
            deposit_date: investment_date,
            percentage: null, // Use member's default percentage
            notes: `Initial deposit - Mode: ${mode_of_payment}`
          });
          console.log('✅ [API] Initial deposit created successfully');
        } catch (depositError: any) {
          console.error('❌ [API] Error creating deposit:', {
            message: depositError?.message,
            code: depositError?.code
          });
          // Don't fail the whole request if deposit creation fails
          // Member is already created
        }
      }

      return res.status(201).json({ id: member.id, success: true });
    } catch (error: any) {
      console.error('❌ [API] Error creating member - Full error:', {
        message: error?.message,
        code: error?.code,
        name: error?.name,
        stack: error?.stack?.substring(0, 500)
      });
      
      // Return detailed error for debugging
      return res.status(500).json({ 
        error: 'Failed to create member',
        details: error?.message || 'Unknown error',
        code: error?.code || 'UNKNOWN',
        name: error?.name || 'Error',
        hint: error?.code === 'permission-denied' 
          ? 'Check Firestore security rules - they should allow authenticated users to write'
          : 'Check Vercel logs for more details'
      });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

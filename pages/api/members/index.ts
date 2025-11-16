import { NextApiRequest, NextApiResponse } from 'next';
import db from '@/lib/db';

// GET all members
export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      const members = db.getMembers();
      return res.status(200).json(members);
    } catch (error) {
      console.error('Error fetching members:', error);
      return res.status(500).json({ error: 'Failed to fetch members' });
    }
  }

  // POST create new member
  if (req.method === 'POST') {
    try {
      const {
        name,
        alias_name,
        village,
        town,
        percentage_of_return,
        date_of_return,
        referral_name,
        referral_percent
      } = req.body;

      if (!name || !percentage_of_return || !date_of_return) {
        return res.status(400).json({ error: 'Name, percentage of return, and date of return are required' });
      }

      const member = db.createMember({
        name,
        alias_name,
        village,
        town,
        percentage_of_return,
        date_of_return,
        referral_name,
        referral_percent
      });

      return res.status(201).json({ id: member.id, success: true });
    } catch (error) {
      console.error('Error creating member:', error);
      return res.status(500).json({ error: 'Failed to create member' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

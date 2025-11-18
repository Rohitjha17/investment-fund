import { NextApiRequest, NextApiResponse } from 'next';
import db from '@/lib/db-firebase';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Invalid member ID' });
  }

  const memberId = parseInt(id);

  // GET single member
  if (req.method === 'GET') {
    try {
      const member = await db.getMember(memberId);
      
      if (!member) {
        return res.status(404).json({ error: 'Member not found' });
      }

      return res.status(200).json(member);
    } catch (error) {
      console.error('Error fetching member:', error);
      return res.status(500).json({ error: 'Failed to fetch member' });
    }
  }

  // PUT update member
  if (req.method === 'PUT') {
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

      const success = await db.updateMember(memberId, {
        name,
        alias_name,
        village,
        town,
        percentage_of_return,
        date_of_return,
        referral_name,
        referral_percent
      });

      if (!success) {
        return res.status(404).json({ error: 'Member not found' });
      }

      return res.status(200).json({ success: true });
    } catch (error) {
      console.error('Error updating member:', error);
      return res.status(500).json({ error: 'Failed to update member' });
    }
  }

  // DELETE member
  if (req.method === 'DELETE') {
    try {
      const success = await db.deleteMember(memberId);

      if (!success) {
        return res.status(404).json({ error: 'Member not found' });
      }

      return res.status(200).json({ success: true });
    } catch (error) {
      console.error('Error deleting member:', error);
      return res.status(500).json({ error: 'Failed to delete member' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

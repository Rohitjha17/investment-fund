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
        referral_percent,
        deposit_amount,
        investment_date
      } = req.body;

      // Check for duplicate names and aliases (excluding current member)
      const allMembers = await db.getMembers();
      
      // Check for duplicate name
      if (name) {
        const duplicateName = allMembers.find((m: any) => 
          m.id !== memberId && 
          m.name && 
          m.name.toLowerCase().trim() === name.toLowerCase().trim()
        );
        if (duplicateName) {
          return res.status(400).json({ 
            error: `A member with the name "${name}" already exists. Please use a different name.` 
          });
        }
      }

      // Check for duplicate alias (if provided)
      if (alias_name && alias_name.trim()) {
        const duplicateAlias = allMembers.find((m: any) => 
          m.id !== memberId && 
          m.alias_name && 
          m.alias_name.toLowerCase().trim() === alias_name.toLowerCase().trim()
        );
        if (duplicateAlias) {
          return res.status(400).json({ 
            error: `A member with the alias "${alias_name}" already exists. Please use a different alias.` 
          });
        }
      }

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

      // Handle deposit update if provided
      if (deposit_amount && investment_date) {
        const member = await db.getMember(memberId);
        if (member && member.deposits && member.deposits.length > 0) {
          // Update first deposit
          const firstDeposit = member.deposits.sort((a: any, b: any) => 
            new Date(a.deposit_date).getTime() - new Date(b.deposit_date).getTime()
          )[0];
          
          await db.updateDeposit(firstDeposit.id, {
            member_id: memberId,
            amount: deposit_amount,
            deposit_date: investment_date,
            percentage: null
          });
        } else {
          // Create new deposit if none exists
          await db.createDeposit({
            member_id: memberId,
            amount: deposit_amount,
            deposit_date: investment_date,
            percentage: null,
            notes: 'Initial deposit'
          });
        }
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

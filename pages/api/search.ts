import { NextApiRequest, NextApiResponse } from 'next';
import db from '@/lib/db';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { q } = req.query;
    
    if (!q || typeof q !== 'string') {
      return res.status(400).json({ error: 'Search query is required' });
    }

    const query = q.toLowerCase().trim();
    const members = db.getMembers();
    
    // Search in name, alias, village, town
    const results = members.filter((member: any) => {
      const nameMatch = member.name?.toLowerCase().includes(query);
      const aliasMatch = member.alias_name?.toLowerCase().includes(query);
      const villageMatch = member.village?.toLowerCase().includes(query);
      const townMatch = member.town?.toLowerCase().includes(query);
      const uniqueMatch = member.unique_number?.toString().includes(query);
      
      return nameMatch || aliasMatch || villageMatch || townMatch || uniqueMatch;
    });

    return res.status(200).json(results);
  } catch (error) {
    console.error('Error searching:', error);
    return res.status(500).json({ error: 'Failed to search' });
  }
}


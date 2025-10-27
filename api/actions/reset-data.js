import { promises as fs } from 'fs';
import path from 'path';

// This dangerous action should only be available in a creator/admin context
export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }
    
    try {
        const DB_PATH = path.join('/tmp', 'smartschool_db.json');
        await fs.unlink(DB_PATH);
        res.status(200).json({ message: 'Data reset successfully. The database will be re-seeded on the next request.' });
    } catch (error) {
        // If file doesn't exist, it's fine.
        if (error.code === 'ENOENT') {
             res.status(200).json({ message: 'No data to reset.' });
        } else {
            console.error('Error resetting data:', error);
            res.status(500).json({ message: 'Internal Server Error' });
        }
    }
}

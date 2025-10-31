import { setData, getSeedData } from '../_lib/db.js';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }
    
    try {
        const seedData = getSeedData();
        await setData(seedData);
        res.status(200).json({ message: 'Data reset successfully.' });
    } catch (error) {
        console.error('Error resetting data:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
}

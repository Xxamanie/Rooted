import { getData } from './_lib/db.js';

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    try {
        const data = await getData();
        res.status(200).json(data);
    } catch (error) {
        console.error('Error bootstrapping data:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
}

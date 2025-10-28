import { getData, setData } from '../_lib/db.js';

export default async function handler(req, res) {
    const db = await getData();

    if (req.method === 'POST') {
        const { message } = req.body;
        db.adminMessage = { message, timestamp: Date.now() };
        await setData(db);
        return res.status(200).json(db.adminMessage);
    }

    if (req.method === 'DELETE') {
        db.adminMessage = null;
        await setData(db);
        return res.status(200).json({ message: 'Admin message cleared.' });
    }

    res.setHeader('Allow', ['POST', 'DELETE']);
    return res.status(405).json({ message: `Method ${req.method} Not Allowed` });
}

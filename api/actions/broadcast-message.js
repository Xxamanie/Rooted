import { getData, setData } from '../_lib/db.js';

export default async function handler(req, res) {
    const db = await getData();

    if (req.method === 'POST') {
        const { message } = req.body;
        db.broadcastMessage = { message, timestamp: Date.now() };
        await setData(db);
        return res.status(200).json(db.broadcastMessage);
    }

    if (req.method === 'DELETE') {
        db.broadcastMessage = null;
        await setData(db);
        return res.status(200).json({ message: 'Broadcast message cleared.' });
    }

    res.setHeader('Allow', ['POST', 'DELETE']);
    return res.status(405).json({ message: `Method ${req.method} Not Allowed` });
}

import { getData, setData } from '../_lib/db.js';

export default async function handler(req, res) {
    if (req.method !== 'PUT') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    try {
        const { notificationIds } = req.body;
        const db = await getData();

        if (db.notifications && Array.isArray(notificationIds)) {
            db.notifications.forEach(n => {
                if (notificationIds.includes(n.id)) {
                    n.read = true;
                }
            });
            await setData(db);
        }
        
        res.status(200).json({ message: 'Notifications marked as read.' });
    } catch (error) {
        console.error('Error in mark-notifications-read:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
}

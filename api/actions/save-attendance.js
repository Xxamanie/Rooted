import { getData, setData } from '../_lib/db.js';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    try {
        const { className, records } = req.body;
        const db = await getData();

        const newRecord = { 
            date: new Date().toLocaleDateString(), 
            class: className, 
            records 
        };

        // Remove today's existing record for this class to avoid duplicates
        db.attendanceRecords = db.attendanceRecords.filter(r => 
            !(r.date === newRecord.date && r.class === newRecord.class)
        );
        db.attendanceRecords.push(newRecord);

        await setData(db);
        res.status(201).json(newRecord);
    } catch (error) {
        console.error('Error in save-attendance:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
}

import { getData, setData } from '../_lib/db.js';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    try {
        const { studentId } = req.body;
        const db = await getData();

        const recordIndex = db.tuitionRecords.findIndex(t => t.studentId === studentId);

        if (recordIndex !== -1) {
            db.tuitionRecords[recordIndex].status = 'Paid';
            await setData(db);
            res.status(200).json(db.tuitionRecords[recordIndex]);
        } else {
            res.status(404).json({ message: 'Tuition record not found.' });
        }
    } catch (error) {
        console.error('Error in process-tuition:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
}

import { getData, setData } from '../_lib/db.js';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    try {
        const { studentId, examId, event } = req.body;
        const db = await getData();

        const examIndex = db.completedExams.findIndex(c => c.studentId === studentId && c.examId === examId);

        if (examIndex !== -1) {
            const newFlag = { timestamp: new Date().toLocaleTimeString(), event };
            db.completedExams[examIndex].proctoringFlags.push(newFlag);
            await setData(db);
            res.status(200).json({ message: 'Flag added' });
        } else {
            res.status(404).json({ message: 'Completed exam record not found.' });
        }
    } catch (error) {
        console.error('Error in add-proctoring-flag:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
}

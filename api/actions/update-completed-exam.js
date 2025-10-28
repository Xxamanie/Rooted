import { getData, setData } from '../_lib/db.js';

export default async function handler(req, res) {
    if (req.method !== 'PUT') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    try {
        const { studentId, examId, score, scaledScore } = req.body;
        const db = await getData();

        const examIndex = db.completedExams.findIndex(c => 
            c.studentId === studentId && c.examId === examId
        );

        if (examIndex !== -1) {
            db.completedExams[examIndex].score = score;
            db.completedExams[examIndex].scaledScore = scaledScore;
            await setData(db);
            res.status(200).json(db.completedExams[examIndex]);
        } else {
            res.status(404).json({ message: 'Completed exam record not found.' });
        }
    } catch (error) {
        console.error('Error in update-completed-exam:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
}

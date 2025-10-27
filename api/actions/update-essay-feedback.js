import { getData, setData } from '../_lib/db.js';

export default async function handler(req, res) {
    if (req.method !== 'PUT') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    try {
        const { assignmentId, studentId, feedback, score } = req.body;
        const db = await getData();

        const subIndex = db.essaySubmissions.findIndex(s => 
            s.assignmentId === assignmentId && s.studentId === studentId
        );

        if (subIndex !== -1) {
            db.essaySubmissions[subIndex] = { 
                ...db.essaySubmissions[subIndex], 
                feedback, 
                score 
            };
            await setData(db);
            res.status(200).json(db.essaySubmissions[subIndex]);
        } else {
            res.status(404).json({ message: 'Submission not found.' });
        }
    } catch (error) {
        console.error('Error in update-essay-feedback:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
}

import { getData, setData } from '../_lib/db.js';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    try {
        const db = await getData();
        const submission = req.body;

        const student = db.students.find(s => s.id === submission.studentId);
        if (!student) {
            return res.status(404).json({ message: "Student not found for submission" });
        }

        const newSubmission = { ...submission, studentName: student.name };
        
        // Remove previous submission if it exists
        db.essaySubmissions = db.essaySubmissions.filter(s => 
            !(s.assignmentId === newSubmission.assignmentId && s.studentId === newSubmission.studentId)
        );
        db.essaySubmissions.push(newSubmission);
        
        await setData(db);

        res.status(201).json(newSubmission);
    } catch (error) {
        console.error('Error in add-essay-submission:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
}

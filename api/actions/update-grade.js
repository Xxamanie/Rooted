import { getData, setData } from '../_lib/db.js';

export default async function handler(req, res) {
    if (req.method !== 'PUT') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    try {
        const gradeData = req.body;
        const db = await getData();
        let gradeFound = false;
        
        db.grades = db.grades.map(g => {
            if (g.studentId === gradeData.studentId && g.term === gradeData.term && g.subject === gradeData.subject) {
                gradeFound = true;
                const updatedGrade = { ...g, ...gradeData };
                updatedGrade.total = (updatedGrade.ca1 || 0) + (updatedGrade.ca2 || 0) + (updatedGrade.ca3 || 0) + (updatedGrade.exam || 0);
                return updatedGrade;
            }
            return g;
        });

        if (!gradeFound) {
            const newGrade = {
                studentId: gradeData.studentId,
                term: gradeData.term,
                subject: gradeData.subject,
                ca1: null, ca2: null, ca3: null, exam: null, total: 0, remarks: '',
                ...gradeData
            };
            newGrade.total = (newGrade.ca1 || 0) + (newGrade.ca2 || 0) + (newGrade.ca3 || 0) + (newGrade.exam || 0);
            db.grades.push(newGrade);
        }

        await setData(db);
        res.status(200).json({ message: 'Grade updated successfully' });
    } catch (error) {
        console.error('Error in update-grade:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
}

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

            // Create a notification for the student
            const assignment = db.essayAssignments.find(a => a.id === assignmentId);
            if (assignment) {
                const newNotification = {
                    id: `notif-${Date.now()}`,
                    studentId: studentId,
                    message: `Your essay "${assignment.title}" has been graded! You scored ${score}/100.`,
                    timestamp: new Date().toISOString(),
                    read: false,
                    type: 'grade'
                };
                if (!db.notifications) {
                    db.notifications = [];
                }
                db.notifications.push(newNotification);
            }

            await setData(db);
            res.status(200).json(db.essaySubmissions[subIndex]);
        } else {
            res.status(404).json({ message: 'Submission not found.' });
        }
    } catch (error)
 {
        console.error('Error in update-essay-feedback:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
}

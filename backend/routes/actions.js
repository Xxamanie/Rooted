import { Router } from 'express';
import { getData, setData, getSeedData } from '../lib/db.js';

const router = Router();

// From: api/actions/add-essay-submission.js
router.post('/add-essay-submission', async (req, res) => {
    try {
        const db = await getData();
        const submission = req.body;
        const student = db.students.find(s => s.id === submission.studentId);
        if (!student) {
            return res.status(404).json({ message: "Student not found for submission" });
        }
        const newSubmission = { ...submission, studentName: student.name };
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
});

// From: api/actions/add-proctoring-flag.js
router.post('/add-proctoring-flag', async (req, res) => {
    try {
        const { studentId, examId, event } = req.body;
        const db = await getData();
        const examIndex = db.completedExams.findIndex(c => c.studentId === studentId && c.examId === examId);
        if (examIndex !== -1) {
            const newFlag = { timestamp: new Date().toLocaleTimeString(), event };
            if (!db.completedExams[examIndex].proctoringFlags) {
                db.completedExams[examIndex].proctoringFlags = [];
            }
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
});

// From: api/actions/admin-message.js
router.post('/admin-message', async (req, res) => {
    const db = await getData();
    const { message } = req.body;
    db.adminMessage = { message, timestamp: Date.now() };
    await setData(db);
    return res.status(200).json(db.adminMessage);
});
router.delete('/admin-message', async (req, res) => {
    const db = await getData();
    db.adminMessage = null;
    await setData(db);
    return res.status(200).json({ message: 'Admin message cleared.' });
});

// From: api/actions/broadcast-message.js
router.post('/broadcast-message', async (req, res) => {
    const db = await getData();
    const { message } = req.body;
    db.broadcastMessage = { message, timestamp: Date.now() };
    await setData(db);
    return res.status(200).json(db.broadcastMessage);
});
router.delete('/broadcast-message', async (req, res) => {
    const db = await getData();
    db.broadcastMessage = null;
    await setData(db);
    return res.status(200).json({ message: 'Broadcast message cleared.' });
});

// From: api/actions/mark-notifications-read.js
router.put('/mark-notifications-read', async (req, res) => {
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
});

// From: api/actions/process-tuition.js
router.post('/process-tuition', async (req, res) => {
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
});

// From: api/actions/reset-data.js
router.post('/reset-data', async (req, res) => {
    try {
        const seedData = getSeedData();
        await setData(seedData);
        res.status(200).json({ message: 'Data reset successfully.' });
    } catch (error) {
        console.error('Error resetting data:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

// From: api/actions/save-attendance.js
router.post('/save-attendance', async (req, res) => {
    try {
        const { className, records } = req.body;
        const db = await getData();
        const newRecord = { 
            date: new Date().toLocaleDateString(), 
            class: className, 
            records 
        };
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
});

// From: api/actions/update-completed-exam.js
router.put('/update-completed-exam', async (req, res) => {
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
});

// From: api/actions/update-essay-feedback.js
router.put('/update-essay-feedback', async (req, res) => {
    try {
        const { assignmentId, studentId, feedback, score } = req.body;
        const db = await getData();
        const subIndex = db.essaySubmissions.findIndex(s => 
            s.assignmentId === assignmentId && s.studentId === studentId
        );
        if (subIndex !== -1) {
            db.essaySubmissions[subIndex] = { ...db.essaySubmissions[subIndex], feedback, score };
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
                if (!db.notifications) db.notifications = [];
                db.notifications.push(newNotification);
            }
            await setData(db);
            res.status(200).json(db.essaySubmissions[subIndex]);
        } else {
            res.status(404).json({ message: 'Submission not found.' });
        }
    } catch (error) {
        console.error('Error in update-essay-feedback:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

// From: api/actions/update-grade.js
router.put('/update-grade', async (req, res) => {
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
});

export default router;

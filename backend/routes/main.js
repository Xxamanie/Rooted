import { Router } from 'express';
import { getData, setData } from '../lib/db.js';

const router = Router();

// From: api/bootstrap.js
router.get('/bootstrap', async (req, res) => {
    try {
        const data = await getData();
        res.status(200).json(data);
    } catch (error) {
        console.error('Error bootstrapping data:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

// From: api/auth.js
router.post('/auth', async (req, res) => {
    const db = await getData();
    const { type, schoolCode, staffId, studentId, accessCode, parentId } = req.body;
    
    const CREATOR_SCHOOL_CODE = 'xxamanie';
    const CREATOR_PASSWORD = process.env.CREATOR_PASSWORD; 

    if (schoolCode === CREATOR_SCHOOL_CODE && staffId === CREATOR_PASSWORD) {
        const creatorUser = { id: 'CREATOR_USER', name: 'App Creator', role: 'Creator' };
        return res.status(200).json({ user: creatorUser, staff: db.staff });
    }

    if (type === 'teacher') {
        const schoolIsValid = db.schools.some(s => s.code === schoolCode);
        const user = db.staff.find(s => s.id === staffId);
        if (schoolIsValid && user) {
            const updatedUser = { ...user, lastSeen: new Date().toLocaleString() };
            db.staff = db.staff.map(s => s.id === staffId ? updatedUser : s);
            await setData(db);
            return res.status(200).json({ user: updatedUser, staff: db.staff });
        }
    }

    if (type === 'student') {
        const codeIsValid = db.accessCodes.some(c => c.studentId === studentId && c.code === accessCode);
        const user = db.students.find(s => s.id === studentId);
        if (codeIsValid && user) {
            return res.status(200).json({ user });
        }
    }

    if (type === 'parent') {
        const codeIsValid = db.parentAccessCodes.some(c => c.parentId === parentId && c.code === accessCode);
        const user = db.parents.find(p => p.id === parentId);
        if (codeIsValid && user) {
            return res.status(200).json({ user });
        }
    }

    return res.status(401).json({ message: 'Invalid credentials' });
});

export default router;

// In a Vercel environment, you have access to Node.js modules
import { promises as fs } from 'fs';
import path from 'path';

// Vercel provides a writable /tmp directory
const DB_PATH = path.join('/tmp', 'smartschool_db.json');
let dbCache = null;

const getSeedData = () => ({
    schools: [
        { 
            id: 'SCH-001', 
            name: 'Default Demo School', 
            code: 'SMRT-2024',
            subscription: {
                type: 'Annually',
                status: 'Active',
                costPerTerm: 400,
                costAnnually: 1000
            }
        }
    ],
    staff: [
        { id: 'ADMIN-001', name: 'Mr. Admin', role: 'Administrator', lastSeen: 'N/A' },
        { id: 'SID-8431', name: 'Mrs. Johnson', role: 'Mathematics', lastSeen: 'N/A' },
        { id: 'SID-1932', name: 'Mr. Smith', role: 'English', lastSeen: 'N/A' },
    ],
    students: [
        { id: 'STU-0012', name: 'Alice Martin', class: 'Grade 10A' },
        { id: 'STU-0013', name: 'Bob Williams', class: 'Grade 11B' },
        { id: 'STU-0014', name: 'Charlie Brown', class: 'Grade 10A' },
    ],
    tuitionRecords: [
        { studentId: 'STU-0012', status: 'Owing', amount: 500 },
        { studentId: 'STU-0013', status: 'Paid', amount: 500 },
        { studentId: 'STU-0014', status: 'Owing', amount: 500 },
    ],
    parents: [],
    announcements: [],
    schemes: [],
    recordsOfWork: [],
    attendanceRecords: [],
    examinations: [],
    completedExams: [],
    essayAssignments: [],
    essaySubmissions: [],
    grades: [],
    lessonPlans: [],
    accessCodes: [],
    parentAccessCodes: [],
    questionBank: [],
    timetable: null,
    tasks: [],
});

export const getData = async () => {
    // Use in-memory cache to avoid reading the file on every single request
    if (dbCache) return dbCache;

    try {
        const fileContent = await fs.readFile(DB_PATH, 'utf-8');
        dbCache = JSON.parse(fileContent);
        return dbCache;
    } catch (error) {
        // If the file doesn't exist, create it with seed data
        if (error.code === 'ENOENT') {
            const seedData = getSeedData();
            await fs.writeFile(DB_PATH, JSON.stringify(seedData, null, 2), 'utf-8');
            dbCache = seedData;
            return dbCache;
        }
        throw error;
    }
};

export const setData = async (data) => {
    await fs.writeFile(DB_PATH, JSON.stringify(data, null, 2), 'utf-8');
    // Invalidate the cache
    dbCache = null;
};

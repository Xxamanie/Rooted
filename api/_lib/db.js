// In a Vercel environment, you have access to Node.js modules
import { kv } from '@vercel/kv';

// The entire database will be stored under a single key for simplicity.
const DB_KEY = 'smartschool_db';

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
    notifications: [],
    lessonPlans: [],
    accessCodes: [],
    parentAccessCodes: [],
    questionBank: [],
    timetable: null,
    tasks: [],
    broadcastMessage: null,
    adminMessage: null,
});

// Use an in-memory cache to reduce KV reads within a single function invocation.
// This is safe because serverless function instances are short-lived.
let dbCache = null;

export const getData = async () => {
    if (dbCache) return dbCache;

    let data = await kv.get(DB_KEY);

    if (!data) {
        console.log('No data found in KV, seeding database...');
        const seedData = getSeedData();
        await kv.set(DB_KEY, seedData);
        dbCache = seedData;
        return seedData;
    }
    
    dbCache = data;
    return data;
};

export const setData = async (data) => {
    await kv.set(DB_KEY, data);
    // Invalidate the cache to ensure the next getData call fetches the fresh data
    dbCache = null;
};

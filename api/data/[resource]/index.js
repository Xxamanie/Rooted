import { getData, setData } from '../../_lib/db.js';

export default async function handler(req, res) {
    const { resource } = req.query;

    try {
        const db = await getData();

        if (!db.hasOwnProperty(resource)) {
            return res.status(404).json({ message: `Resource type '${resource}' not found.` });
        }

        if (req.method === 'GET') {
            return res.status(200).json(db[resource]);
        }

        if (req.method === 'POST') {
            const newItem = req.body;
            db[resource].push(newItem);
            
            // Special handling for new students to create a tuition record
            if (resource === 'students') {
                 const newTuitionRecord = { studentId: newItem.id, status: 'Owing', amount: 500 };
                 db.tuitionRecords.push(newTuitionRecord);
            }

            await setData(db);
            return res.status(201).json(newItem);
        }

        res.setHeader('Allow', ['GET', 'POST']);
        return res.status(405).json({ message: `Method ${req.method} Not Allowed` });
    } catch (error) {
        console.error(`Error in /${resource}:`, error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
}

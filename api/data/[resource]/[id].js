import { getData, setData } from '../../_lib/db.js';

export default async function handler(req, res) {
    const { resource, id } = req.query;

    try {
        const db = await getData();

        if (!db.hasOwnProperty(resource)) {
            return res.status(404).json({ message: `Resource type '${resource}' not found.` });
        }

        const resourceArray = db[resource];
        const itemIndex = resourceArray.findIndex(item => item.id == id);

        if (itemIndex === -1) {
            return res.status(404).json({ message: `Item with id '${id}' not found in '${resource}'.` });
        }

        if (req.method === 'DELETE') {
            const [deletedItem] = resourceArray.splice(itemIndex, 1);
            
            // Cascade delete for students
            if (resource === 'students') {
                db.tuitionRecords = db.tuitionRecords.filter(t => t.studentId !== id);
                db.grades = db.grades.filter(g => g.studentId !== id);
            }

            await setData(db);
            return res.status(200).json(deletedItem);
        }
        
        if (req.method === 'PUT') {
            // This handles generic updates where the body is merged with the existing item.
            // For subscription, it needs to merge the nested object.
            if (resource === 'schools' && req.body.subscription) {
                 db[resource][itemIndex].subscription = { ...db[resource][itemIndex].subscription, ...req.body.subscription };
            } else {
                 db[resource][itemIndex] = { ...db[resource][itemIndex], ...req.body };
            }
           
            await setData(db);
            return res.status(200).json(db[resource][itemIndex]);
        }

        res.setHeader('Allow', ['DELETE', 'PUT']);
        return res.status(405).json({ message: `Method ${req.method} Not Allowed` });

    } catch (error) {
        console.error(`Error in /${resource}/${id}:`, error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
}

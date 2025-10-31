import { Router } from 'express';
import { getData, setData } from '../lib/db.js';

const router = Router();

// From: api/data/[resource]/index.js
router.get('/:resource', async (req, res) => {
    const { resource } = req.params;
    try {
        const db = await getData();
        if (!db.hasOwnProperty(resource)) {
            return res.status(404).json({ message: `Resource type '${resource}' not found.` });
        }
        return res.status(200).json(db[resource]);
    } catch (error) {
        console.error(`Error in GET /data/${resource}:`, error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

router.post('/:resource', async (req, res) => {
    const { resource } = req.params;
    try {
        const db = await getData();
        if (!db.hasOwnProperty(resource)) {
            return res.status(404).json({ message: `Resource type '${resource}' not found.` });
        }
        const newItem = req.body;
        db[resource].push(newItem);
        if (resource === 'students') {
            const newTuitionRecord = { studentId: newItem.id, status: 'Owing', amount: 500 };
            db.tuitionRecords.push(newTuitionRecord);
        }
        await setData(db);
        return res.status(201).json(newItem);
    } catch (error) {
        console.error(`Error in POST /data/${resource}:`, error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

// From: api/data/[resource]/[id].js
router.put('/:resource/:id', async (req, res) => {
    const { resource, id } = req.params;
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
        if (resource === 'schools' && req.body.subscription) {
            db[resource][itemIndex].subscription = { ...db[resource][itemIndex].subscription, ...req.body.subscription };
        } else {
            db[resource][itemIndex] = { ...db[resource][itemIndex], ...req.body };
        }
        await setData(db);
        return res.status(200).json(db[resource][itemIndex]);
    } catch (error) {
        console.error(`Error in PUT /data/${resource}/${id}:`, error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

router.delete('/:resource/:id', async (req, res) => {
    const { resource, id } = req.params;
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
        const [deletedItem] = resourceArray.splice(itemIndex, 1);
        if (resource === 'students') {
            db.tuitionRecords = db.tuitionRecords.filter(t => t.studentId !== id);
            db.grades = db.grades.filter(g => g.studentId !== id);
        }
        await setData(db);
        return res.status(200).json(deletedItem);
    } catch (error) {
        console.error(`Error in DELETE /data/${resource}/${id}:`, error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

export default router;

const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs').promises;

// Path to data file
const dataPath = path.join(__dirname, '../data/questions.json');

// Helper function to read questions data
async function readQuestions() {
    try {
        const data = await fs.readFile(dataPath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        // If file doesn't exist, return default structure
        return {
            basis_data: [],
            ppl: [],
            pwpb: [],
            pbo: []
        };
    }
}

// Helper function to write questions data
async function writeQuestions(data) {
    await fs.writeFile(dataPath, JSON.stringify(data, null, 2), 'utf8');
}

// GET /api/questions/:subject - Get questions by subject
router.get('/:subject', async (req, res) => {
    try {
        const { subject } = req.params;
        const validSubjects = ['basis_data', 'ppl', 'pwpb', 'pbo'];
        
        if (!validSubjects.includes(subject)) {
            return res.status(400).json({ error: 'Mata pelajaran tidak valid' });
        }
        
        const data = await readQuestions();
        res.json({
            subject,
            questions: data[subject] || []
        });
        
    } catch (error) {
        console.error('Error reading questions:', error);
        res.status(500).json({ error: 'Gagal memuat soal' });
    }
});

// GET /api/questions/:subject/:id - Get specific question
router.get('/:subject/:id', async (req, res) => {
    try {
        const { subject, id } = req.params;
        const validSubjects = ['basis_data', 'ppl', 'pwpb', 'pbo'];
        
        if (!validSubjects.includes(subject)) {
            return res.status(400).json({ error: 'Mata pelajaran tidak valid' });
        }
        
        const data = await readQuestions();
        const questions = data[subject] || [];
        const question = questions.find(q => q.id === parseInt(id));
        
        if (!question) {
            return res.status(404).json({ error: 'Soal tidak ditemukan' });
        }
        
        res.json(question);
        
    } catch (error) {
        console.error('Error reading question:', error);
        res.status(500).json({ error: 'Gagal memuat soal' });
    }
});

// POST /api/questions - Create new question
router.post('/', async (req, res) => {
    try {
        const { subject, type, question, points, code_template, test_cases, answer_key } = req.body;
        
        // Validation
        if (!subject || !type || !question || !points) {
            return res.status(400).json({ 
                error: 'Subject, type, question, dan points harus diisi' 
            });
        }
        
        const validSubjects = ['basis_data', 'ppl', 'pwpb', 'pbo'];
        const validTypes = ['coding', 'essay'];
        
        if (!validSubjects.includes(subject)) {
            return res.status(400).json({ error: 'Subject tidak valid' });
        }
        
        if (!validTypes.includes(type)) {
            return res.status(400).json({ error: 'Type tidak valid' });
        }
        
        if (points < 1 || points > 100) {
            return res.status(400).json({ error: 'Points harus antara 1-100' });
        }
        
        const data = await readQuestions();
        
        // Create new question
        const newQuestion = {
            id: data[subject].length > 0 ? 
                Math.max(...data[subject].map(q => q.id)) + 1 : 1,
            type,
            question,
            points,
            createdAt: new Date().toISOString()
        };
        
        // Add type-specific fields
        if (type === 'coding') {
            newQuestion.code_template = code_template || '';
            newQuestion.test_cases = test_cases || [{ input: '', expected: 'Output yang diharapkan' }];
        } else if (type === 'essay') {
            newQuestion.answer_key = answer_key || [];
        }
        
        // Initialize subject array if it doesn't exist
        if (!data[subject]) {
            data[subject] = [];
        }
        
        data[subject].push(newQuestion);
        await writeQuestions(data);
        
        res.status(201).json({
            message: 'Soal berhasil ditambahkan',
            question: newQuestion
        });
        
    } catch (error) {
        console.error('Error creating question:', error);
        res.status(500).json({ error: 'Gagal menambah soal' });
    }
});

// PUT /api/questions/:subject/:id - Update question
router.put('/:subject/:id', async (req, res) => {
    try {
        const { subject, id } = req.params;
        const { type, question, points, code_template, test_cases, answer_key } = req.body;
        
        // Validation
        if (!type || !question || !points) {
            return res.status(400).json({ 
                error: 'Type, question, dan points harus diisi' 
            });
        }
        
        const data = await readQuestions();
        
        if (!data[subject]) {
            return res.status(404).json({ error: 'Subject tidak ditemukan' });
        }
        
        const questionIndex = data[subject].findIndex(q => q.id === parseInt(id));
        
        if (questionIndex === -1) {
            return res.status(404).json({ error: 'Soal tidak ditemukan' });
        }
        
        // Update question
        data[subject][questionIndex] = {
            ...data[subject][questionIndex],
            type,
            question,
            points,
            updatedAt: new Date().toISOString()
        };
        
        // Update type-specific fields
        if (type === 'coding') {
            data[subject][questionIndex].code_template = code_template || '';
            data[subject][questionIndex].test_cases = test_cases || [];
            delete data[subject][questionIndex].answer_key;
        } else if (type === 'essay') {
            data[subject][questionIndex].answer_key = answer_key || [];
            delete data[subject][questionIndex].code_template;
            delete data[subject][questionIndex].test_cases;
        }
        
        await writeQuestions(data);
        
        res.json({
            message: 'Soal berhasil diperbarui',
            question: data[subject][questionIndex]
        });
        
    } catch (error) {
        console.error('Error updating question:', error);
        res.status(500).json({ error: 'Gagal memperbarui soal' });
    }
});

// DELETE /api/questions/:subject/:id - Delete question
router.delete('/:subject/:id', async (req, res) => {
    try {
        const { subject, id } = req.params;
        const data = await readQuestions();
        
        if (!data[subject]) {
            return res.status(404).json({ error: 'Subject tidak ditemukan' });
        }
        
        const questionIndex = data[subject].findIndex(q => q.id === parseInt(id));
        
        if (questionIndex === -1) {
            return res.status(404).json({ error: 'Soal tidak ditemukan' });
        }
        
        // Remove question
        const deletedQuestion = data[subject].splice(questionIndex, 1)[0];
        await writeQuestions(data);
        
        res.json({
            message: 'Soal berhasil dihapus',
            question: deletedQuestion
        });
        
    } catch (error) {
        console.error('Error deleting question:', error);
        res.status(500).json({ error: 'Gagal menghapus soal' });
    }
});

// GET /api/questions - Get all questions (for admin)
router.get('/', async (req, res) => {
    try {
        const data = await readQuestions();
        res.json(data);
    } catch (error) {
        console.error('Error reading all questions:', error);
        res.status(500).json({ error: 'Gagal memuat soal' });
    }
});

module.exports = router;
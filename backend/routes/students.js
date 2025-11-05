const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs').promises;

// Path to data file
const dataPath = path.join(__dirname, '../data/students.json');

// Helper function to read students data
async function readStudents() {
    try {
        const data = await fs.readFile(dataPath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        // If file doesn't exist, return default structure
        return { students: [] };
    }
}

// Helper function to write students data
async function writeStudents(data) {
    await fs.writeFile(dataPath, JSON.stringify(data, null, 2), 'utf8');
}

// GET /api/students - Get all students
router.get('/', async (req, res) => {
    try {
        const data = await readStudents();
        res.json(data);
    } catch (error) {
        console.error('Error reading students:', error);
        res.status(500).json({ error: 'Gagal memuat data siswa' });
    }
});

// GET /api/students/:id - Get student by ID
router.get('/:id', async (req, res) => {
    try {
        const data = await readStudents();
        const student = data.students.find(s => s.id === parseInt(req.params.id));
        
        if (!student) {
            return res.status(404).json({ error: 'Siswa tidak ditemukan' });
        }
        
        res.json(student);
    } catch (error) {
        console.error('Error reading student:', error);
        res.status(500).json({ error: 'Gagal memuat data siswa' });
    }
});

// POST /api/students - Create new student
router.post('/', async (req, res) => {
    try {
        const { name, class: className, nis } = req.body;
        
        // Validation
        if (!name || !className || !nis) {
            return res.status(400).json({ error: 'Nama, kelas, dan NIS harus diisi' });
        }
        
        const data = await readStudents();
        
        // Check if NIS already exists
        const existingStudent = data.students.find(s => s.nis === nis);
        if (existingStudent) {
            return res.status(400).json({ error: 'NIS sudah terdaftar' });
        }
        
        // Create new student
        const newStudent = {
            id: data.students.length > 0 ? Math.max(...data.students.map(s => s.id)) + 1 : 1,
            name,
            class: className,
            nis,
            createdAt: new Date().toISOString()
        };
        
        data.students.push(newStudent);
        await writeStudents(data);
        
        res.status(201).json({
            message: 'Siswa berhasil ditambahkan',
            student: newStudent
        });
        
    } catch (error) {
        console.error('Error creating student:', error);
        res.status(500).json({ error: 'Gagal menambah siswa' });
    }
});

// PUT /api/students/:id - Update student
router.put('/:id', async (req, res) => {
    try {
        const { name, class: className, nis } = req.body;
        const studentId = parseInt(req.params.id);
        
        if (!name || !className || !nis) {
            return res.status(400).json({ error: 'Nama, kelas, dan NIS harus diisi' });
        }
        
        const data = await readStudents();
        const studentIndex = data.students.findIndex(s => s.id === studentId);
        
        if (studentIndex === -1) {
            return res.status(404).json({ error: 'Siswa tidak ditemukan' });
        }
        
        // Check if NIS already exists (excluding current student)
        const existingStudent = data.students.find(s => s.nis === nis && s.id !== studentId);
        if (existingStudent) {
            return res.status(400).json({ error: 'NIS sudah terdaftar' });
        }
        
        // Update student
        data.students[studentIndex] = {
            ...data.students[studentIndex],
            name,
            class: className,
            nis,
            updatedAt: new Date().toISOString()
        };
        
        await writeStudents(data);
        
        res.json({
            message: 'Siswa berhasil diperbarui',
            student: data.students[studentIndex]
        });
        
    } catch (error) {
        console.error('Error updating student:', error);
        res.status(500).json({ error: 'Gagal memperbarui siswa' });
    }
});

// DELETE /api/students/:id - Delete student
router.delete('/:id', async (req, res) => {
    try {
        const studentId = parseInt(req.params.id);
        const data = await readStudents();
        
        const studentIndex = data.students.findIndex(s => s.id === studentId);
        
        if (studentIndex === -1) {
            return res.status(404).json({ error: 'Siswa tidak ditemukan' });
        }
        
        // Remove student
        const deletedStudent = data.students.splice(studentIndex, 1)[0];
        await writeStudents(data);
        
        res.json({
            message: 'Siswa berhasil dihapus',
            student: deletedStudent
        });
        
    } catch (error) {
        console.error('Error deleting student:', error);
        res.status(500).json({ error: 'Gagal menghapus siswa' });
    }
});

module.exports = router;

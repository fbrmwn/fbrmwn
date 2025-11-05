const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs').promises;
const XLSX = require('xlsx');

// Path to data files
const resultsPath = path.join(__dirname, '../data/results.json');
const studentsPath = path.join(__dirname, '../data/students.json');
const questionsPath = path.join(__dirname, '../data/questions.json');

// Helper function to read results data
async function readResults() {
    try {
        const data = await fs.readFile(resultsPath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        return { results: [] };
    }
}

// Helper function to write results data
async function writeResults(data) {
    await fs.writeFile(resultsPath, JSON.stringify(data, null, 2), 'utf8');
}

// Helper function to read students data
async function readStudents() {
    try {
        const data = await fs.readFile(studentsPath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        return { students: [] };
    }
}

// Helper function to read questions data
async function readQuestions() {
    try {
        const data = await fs.readFile(questionsPath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        return {
            basis_data: [],
            ppl: [],
            pwpb: [],
            pbo: []
        };
    }
}

// POST /api/scores/calculate - Calculate test score
router.post('/calculate', async (req, res) => {
    try {
        const { studentId, subject, answers, questions, timeUsed } = req.body;
        
        // Validation
        if (!studentId || !subject || !answers || !questions) {
            return res.status(400).json({ 
                error: 'Data tidak lengkap' 
            });
        }
        
        // Get student data
        const studentsData = await readStudents();
        const student = studentsData.students.find(s => s.id === studentId);
        
        if (!student) {
            return res.status(404).json({ error: 'Siswa tidak ditemukan' });
        }
        
        // Calculate scores
        let totalScore = 0;
        let maxScore = 0;
        const questionScores = [];
        
        for (const question of questions) {
            const studentAnswer = answers[question.id] || '';
            let score = 0;
            
            if (question.type === 'coding') {
                // Simple coding scoring based on test cases
                score = this.gradeCodingQuestion(question, studentAnswer);
            } else if (question.type === 'essay') {
                // Essay scoring based on keyword matching
                score = this.gradeEssayQuestion(question, studentAnswer);
            }
            
            questionScores.push({
                questionId: question.id,
                type: question.type,
                score: score,
                maxScore: question.points,
                studentAnswer: studentAnswer
            });
            
            totalScore += score;
            maxScore += question.points;
        }
        
        const finalScore = maxScore > 0 ? (totalScore / maxScore) * 100 : 0;
        
        // Save result
        const resultsData = await readResults();
        const newResult = {
            id: resultsData.results.length > 0 ? 
                Math.max(...resultsData.results.map(r => r.id)) + 1 : 1,
            studentId,
            studentName: student.name,
            studentClass: student.class,
            studentNIS: student.nis,
            subject,
            finalScore,
            totalScore,
            maxScore,
            timeUsed: timeUsed || 0,
            questionScores,
            timestamp: new Date().toISOString()
        };
        
        resultsData.results.push(newResult);
        await writeResults(resultsData);
        
        res.json({
            finalScore,
            totalScore,
            maxScore,
            timeUsed,
            questionScores,
            student: {
                name: student.name,
                class: student.class,
                nis: student.nis
            }
        });
        
    } catch (error) {
        console.error('Error calculating score:', error);
        res.status(500).json({ error: 'Gagal menghitung nilai' });
    }
});

// Grading function for coding questions
function gradeCodingQuestion(question, answer) {
    if (!answer || !answer.trim()) {
        return 0;
    }
    
    let score = 0;
    const testCases = question.test_cases || [];
    
    if (testCases.length > 0) {
        // Simple scoring: 50% for having code, 50% for test cases
        const baseScore = question.points * 0.5;
        const testCaseScore = (question.points * 0.5) / testCases.length;
        
        score += baseScore; // Give base score for attempting
        
        // Check if code contains important keywords (simple validation)
        const importantKeywords = ['function', 'return', 'if', 'for', 'while', 'SELECT', 'FROM', 'WHERE'];
        const hasKeywords = importantKeywords.some(keyword => 
            answer.toUpperCase().includes(keyword.toUpperCase())
        );
        
        if (hasKeywords) {
            score += testCaseScore * testCases.length * 0.5;
        }
    } else {
        // No test cases, give partial credit for attempt
        score = answer.trim().length > 10 ? question.points * 0.7 : question.points * 0.3;
    }
    
    return Math.min(score, question.points);
}

// Grading function for essay questions
function gradeEssayQuestion(question, answer) {
    if (!answer || !answer.trim()) {
        return 0;
    }
    
    const answerKey = question.answer_key || [];
    const answerLower = answer.toLowerCase();
    
    if (answerKey.length === 0) {
        // No answer key, give credit based on length and structure
        const wordCount = answer.split(/\s+/).length;
        if (wordCount < 10) return question.points * 0.3;
        if (wordCount < 50) return question.points * 0.6;
        return question.points * 0.8;
    }
    
    // Check for keywords in answer
    let matchedKeywords = 0;
    answerKey.forEach(keyword => {
        if (answerLower.includes(keyword.toLowerCase())) {
            matchedKeywords++;
        }
    });
    
    const keywordRatio = matchedKeywords / answerKey.length;
    return keywordRatio * question.points;
}

// GET /api/scores/results - Get all results
router.get('/results', async (req, res) => {
    try {
        const { subject } = req.query;
        const data = await readResults();
        
        let results = data.results || [];
        
        // Filter by subject if provided
        if (subject && subject !== 'all') {
            results = results.filter(result => result.subject === subject);
        }
        
        // Sort by timestamp (newest first)
        results.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        
        res.json({
            results,
            total: results.length
        });
        
    } catch (error) {
        console.error('Error reading results:', error);
        res.status(500).json({ error: 'Gagal memuat hasil' });
    }
});

// GET /api/scores/results/:studentId - Get results by student
router.get('/results/:studentId', async (req, res) => {
    try {
        const { studentId } = req.params;
        const data = await readResults();
        
        const studentResults = (data.results || [])
            .filter(result => result.studentId === parseInt(studentId))
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        
        res.json({
            results: studentResults,
            total: studentResults.length
        });
        
    } catch (error) {
        console.error('Error reading student results:', error);
        res.status(500).json({ error: 'Gagal memuat hasil siswa' });
    }
});

// GET /api/scores/export - Export results to Excel
router.get('/export', async (req, res) => {
    try {
        const resultsData = await readResults();
        const studentsData = await readStudents();
        const questionsData = await readQuestions();
        
        const results = resultsData.results || [];
        
        if (results.length === 0) {
            return res.status(404).json({ error: 'Tidak ada data hasil untuk diexport' });
        }
        
        // Prepare data for Excel
        const excelData = results.map(result => {
            const student = studentsData.students.find(s => s.id === result.studentId);
            
            return {
                'NIS': result.studentNIS,
                'Nama Siswa': result.studentName,
                'Kelas': result.studentClass,
                'Mata Pelajaran': getSubjectDisplayName(result.subject),
                'Nilai Akhir': result.finalScore.toFixed(2),
                'Total Score': result.totalScore,
                'Max Score': result.maxScore,
                'Waktu Digunakan': formatTime(result.timeUsed),
                'Tanggal Test': new Date(result.timestamp).toLocaleString('id-ID'),
                'Detail Jawaban': JSON.stringify(result.questionScores)
            };
        });
        
        // Create workbook
        const workbook = XLSX.utils.book_new();
        const worksheet = XLSX.utils.json_to_sheet(excelData);
        
        // Set column widths
        const colWidths = [
            { wch: 10 }, // NIS
            { wch: 20 }, // Nama
            { wch: 15 }, // Kelas
            { wch: 20 }, // Mata Pelajaran
            { wch: 12 }, // Nilai Akhir
            { wch: 12 }, // Total Score
            { wch: 12 }, // Max Score
            { wch: 15 }, // Waktu
            { wch: 20 }, // Tanggal
            { wch: 50 }  // Detail
        ];
        worksheet['!cols'] = colWidths;
        
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Hasil Test');
        
        // Generate buffer
        const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
        
        // Set headers for download
        const filename = `hasil-test-${new Date().toISOString().split('T')[0]}.xlsx`;
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        
        res.send(buffer);
        
    } catch (error) {
        console.error('Error exporting results:', error);
        res.status(500).json({ error: 'Gagal mengekspor hasil' });
    }
});

// Helper functions
function getSubjectDisplayName(subject) {
    const subjects = {
        'basis_data': 'Basis Data',
        'ppl': 'PPL',
        'pwpb': 'PWPB',
        'pbo': 'PBO'
    };
    return subjects[subject] || subject;
}

function formatTime(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

// Attach grading functions to router for testing
router.gradeCodingQuestion = gradeCodingQuestion;
router.gradeEssayQuestion = gradeEssayQuestion;

module.exports = router;
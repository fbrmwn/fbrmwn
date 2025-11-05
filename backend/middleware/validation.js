// Validation middleware for request data
const validateStudent = (req, res, next) => {
    const { name, class: className, nis } = req.body;
    const errors = [];

    if (!name || name.trim().length < 2) {
        errors.push('Nama harus diisi dan minimal 2 karakter');
    }

    if (!className || className.trim().length === 0) {
        errors.push('Kelas harus diisi');
    }

    if (!nis || nis.trim().length === 0) {
        errors.push('NIS harus diisi');
    }

    if (errors.length > 0) {
        return res.status(400).json({ 
            error: 'Data tidak valid', 
            details: errors 
        });
    }

    next();
};

const validateQuestion = (req, res, next) => {
    const { type, question, points, subject } = req.body;
    const errors = [];
    const validTypes = ['coding', 'essay'];
    const validSubjects = ['basis_data', 'ppl', 'pwpb', 'pbo'];

    if (!validTypes.includes(type)) {
        errors.push('Tipe soal harus coding atau essay');
    }

    if (!validSubjects.includes(subject)) {
        errors.push('Subject tidak valid');
    }

    if (!question || question.trim().length < 10) {
        errors.push('Pertanyaan harus diisi dan minimal 10 karakter');
    }

    if (!points || points < 1 || points > 100) {
        errors.push('Points harus antara 1-100');
    }

    if (errors.length > 0) {
        return res.status(400).json({ 
            error: 'Data soal tidak valid', 
            details: errors 
        });
    }

    next();
};

const validateScoreCalculation = (req, res, next) => {
    const { studentId, subject, answers, questions } = req.body;
    const errors = [];
    const validSubjects = ['basis_data', 'ppl', 'pwpb', 'pbo'];

    if (!studentId || studentId < 1) {
        errors.push('Student ID harus valid');
    }

    if (!validSubjects.includes(subject)) {
        errors.push('Subject tidak valid');
    }

    if (!answers || typeof answers !== 'object') {
        errors.push('Answers harus berupa object');
    }

    if (!questions || !Array.isArray(questions)) {
        errors.push('Questions harus berupa array');
    }

    if (errors.length > 0) {
        return res.status(400).json({ 
            error: 'Data perhitungan nilai tidak valid', 
            details: errors 
        });
    }

    next();
};

module.exports = {
    validateStudent,
    validateQuestion,
    validateScoreCalculation
};
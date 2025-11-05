class Question {
    constructor(id, type, question, points, subject) {
        this.id = id;
        this.type = type;
        this.question = question;
        this.points = points;
        this.subject = subject;
        this.createdAt = new Date().toISOString();
        this.updatedAt = new Date().toISOString();
        
        // Type-specific properties
        if (type === 'coding') {
            this.code_template = '';
            this.test_cases = [];
        } else if (type === 'essay') {
            this.answer_key = [];
        }
    }

    validate() {
        const errors = [];
        const validTypes = ['coding', 'essay'];
        const validSubjects = ['basis_data', 'ppl', 'pwpb', 'pbo'];
        
        if (!validTypes.includes(this.type)) {
            errors.push('Tipe soal harus coding atau essay');
        }
        
        if (!validSubjects.includes(this.subject)) {
            errors.push('Subject tidak valid');
        }
        
        if (!this.question || this.question.trim().length < 10) {
            errors.push('Pertanyaan harus diisi dan minimal 10 karakter');
        }
        
        if (!this.points || this.points < 1 || this.points > 100) {
            errors.push('Points harus antara 1-100');
        }
        
        // Type-specific validation
        if (this.type === 'coding') {
            if (!Array.isArray(this.test_cases)) {
                errors.push('Test cases harus berupa array');
            }
        } else if (this.type === 'essay') {
            if (!Array.isArray(this.answer_key)) {
                errors.push('Answer key harus berupa array');
            }
        }
        
        return errors;
    }

    toJSON() {
        const base = {
            id: this.id,
            type: this.type,
            question: this.question,
            points: this.points,
            subject: this.subject,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt
        };
        
        // Add type-specific properties
        if (this.type === 'coding') {
            base.code_template = this.code_template;
            base.test_cases = this.test_cases;
        } else if (this.type === 'essay') {
            base.answer_key = this.answer_key;
        }
        
        return base;
    }

    static fromJSON(data) {
        const question = new Question(data.id, data.type, data.question, data.points, data.subject);
        question.createdAt = data.createdAt || new Date().toISOString();
        question.updatedAt = data.updatedAt || new Date().toISOString();
        
        // Set type-specific properties
        if (data.type === 'coding') {
            question.code_template = data.code_template || '';
            question.test_cases = data.test_cases || [];
        } else if (data.type === 'essay') {
            question.answer_key = data.answer_key || [];
        }
        
        return question;
    }
}

module.exports = Question;
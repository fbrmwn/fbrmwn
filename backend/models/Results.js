class Result {
    constructor(id, studentId, subject, finalScore, totalScore, maxScore, timeUsed, questionScores) {
        this.id = id;
        this.studentId = studentId;
        this.subject = subject;
        this.finalScore = finalScore;
        this.totalScore = totalScore;
        this.maxScore = maxScore;
        this.timeUsed = timeUsed || 0;
        this.questionScores = questionScores || [];
        this.timestamp = new Date().toISOString();
    }

    validate() {
        const errors = [];
        const validSubjects = ['basis_data', 'ppl', 'pwpb', 'pbo'];
        
        if (!this.studentId || this.studentId < 1) {
            errors.push('Student ID harus valid');
        }
        
        if (!validSubjects.includes(this.subject)) {
            errors.push('Subject tidak valid');
        }
        
        if (this.finalScore < 0 || this.finalScore > 100) {
            errors.push('Final score harus antara 0-100');
        }
        
        if (this.totalScore < 0) {
            errors.push('Total score tidak boleh negatif');
        }
        
        if (this.maxScore < 0) {
            errors.push('Max score tidak boleh negatif');
        }
        
        if (this.timeUsed < 0) {
            errors.push('Time used tidak boleh negatif');
        }
        
        if (!Array.isArray(this.questionScores)) {
            errors.push('Question scores harus berupa array');
        }
        
        return errors;
    }

    toJSON() {
        return {
            id: this.id,
            studentId: this.studentId,
            subject: this.subject,
            finalScore: this.finalScore,
            totalScore: this.totalScore,
            maxScore: this.maxScore,
            timeUsed: this.timeUsed,
            questionScores: this.questionScores,
            timestamp: this.timestamp
        };
    }

    static fromJSON(data) {
        const result = new Result(
            data.id,
            data.studentId,
            data.subject,
            data.finalScore,
            data.totalScore,
            data.maxScore,
            data.timeUsed,
            data.questionScores
        );
        result.timestamp = data.timestamp || new Date().toISOString();
        return result;
    }
}

module.exports = Result;
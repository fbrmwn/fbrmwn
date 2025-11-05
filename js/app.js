// Main Application Class
class App {
    constructor() {
        this.apiBaseUrl = 'http://localhost:3000/api';
        this.currentStudent = null;
        this.currentSubject = null;
        this.currentQuestions = [];
        this.currentQuestionIndex = 0;
        this.studentAnswers = {};
        this.testStarted = false;
        this.timerInterval = null;
        this.timeRemaining = 0;
        
        this.init();
    }

    async init() {
        await this.loadStudents();
        this.setupEventListeners();
        await this.checkServerStatus();
        
        console.log('✅ Aplikasi berhasil diinisialisasi');
    }

    async checkServerStatus() {
        try {
            const response = await fetch(`${this.apiBaseUrl}/health`);
            if (!response.ok) throw new Error('Server tidak responsif');
            
            const data = await response.json();
            this.showNotification(`Server terhubung - ${data.timestamp}`, 'success');
        } catch (error) {
            console.error('Server error:', error);
            this.showNotification('⚠️ Koneksi server bermasalah, menggunakan mode offline', 'warning');
        }
    }

    async loadStudents() {
        try {
            this.showLoading(true);
            const response = await fetch(`${this.apiBaseUrl}/students`);
            
            if (!response.ok) throw new Error('Gagal memuat data siswa');
            
            const data = await response.json();
            this.populateStudentSelect(data.students);
            
        } catch (error) {
            console.error('Error loading students:', error);
            this.showNotification('Gagal memuat data siswa', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    populateStudentSelect(students) {
        const select = document.getElementById('studentSelect');
        select.innerHTML = '<option value="">-- Pilih Nama --</option>';
        
        students.forEach(student => {
            const option = document.createElement('option');
            option.value = student.id;
            option.textContent = `${student.name} - ${student.class} (NIS: ${student.nis})`;
            option.setAttribute('data-student', JSON.stringify(student));
            select.appendChild(option);
        });
    }

    setupEventListeners() {
        // Student selection
        document.getElementById('studentSelect').addEventListener('change', (e) => {
            this.onStudentSelect(e.target.value);
        });

        // Subject selection
        document.getElementById('subjectSelect').addEventListener('change', (e) => {
            this.currentSubject = e.target.value;
            if (this.currentStudent) {
                this.loadQuestions(e.target.value);
            }
        });

        // Question type change in admin modal
        document.getElementById('questionType').addEventListener('change', (e) => {
            this.toggleQuestionFields(e.target.value);
        });

        // Auto-save answers when typing
        document.addEventListener('input', (e) => {
            if (e.target.classList.contains('code-editor') || e.target.classList.contains('essay-answer')) {
                const questionId = e.target.id.replace('answer_', '');
                this.studentAnswers[questionId] = e.target.value;
            }
        });
    }

    onStudentSelect(studentId) {
        if (!studentId) {
            document.getElementById('studentInfo').classList.add('hidden');
            this.currentStudent = null;
            return;
        }
        
        const selectedOption = document.getElementById('studentSelect').selectedOptions[0];
        const studentData = JSON.parse(selectedOption.getAttribute('data-student'));
        
        document.getElementById('studentInfo').innerHTML = `
            <strong><i class="fas fa-user-check"></i> Siswa Terpilih:</strong> 
            ${studentData.name} - ${studentData.class} (NIS: ${studentData.nis})
        `;
        document.getElementById('studentInfo').classList.remove('hidden');
        
        this.currentStudent = studentId;
        
        // Load questions for selected subject if already chosen
        if (this.currentSubject) {
            this.loadQuestions(this.currentSubject);
        }
    }

    async loadQuestions(subject) {
        if (!subject || !this.currentStudent) return;
        
        try {
            this.showLoading(true);
            const response = await fetch(`${this.apiBaseUrl}/questions/${subject}`);
            
            if (!response.ok) throw new Error('Gagal memuat soal');
            
            const data = await response.json();
            this.currentQuestions = data.questions || [];
            
            console.log(`📚 Memuat ${this.currentQuestions.length} soal untuk ${subject}`);
            
            if (this.currentQuestions.length === 0) {
                this.showNotification(`Tidak ada soal untuk mata pelajaran ${subject}`, 'warning');
            }
            
        } catch (error) {
            console.error('Error loading questions:', error);
            this.showNotification('Gagal memuat soal', 'error');
            this.currentQuestions = [];
        } finally {
            this.showLoading(false);
        }
    }

    // Admin Functions
    async startTest(duration = 7200) { // 2 hours default
        if (!this.currentStudent) {
            this.showNotification('❌ Pilih siswa terlebih dahulu', 'warning');
            return;
        }

        if (this.currentQuestions.length === 0) {
            this.showNotification('❌ Tidak ada soal untuk mata pelajaran ini', 'warning');
            return;
        }

        this.testStarted = true;
        this.currentQuestionIndex = 0;
        this.studentAnswers = {};
        this.timeRemaining = duration;
        
        // Show test interface
        document.getElementById('testInterface').classList.remove('hidden');
        document.getElementById('studentSetup').style.display = 'none';
        
        this.showQuestion(0);
        this.startTimer(duration);
        
        this.showNotification('🚀 Test dimulai! Semoga sukses!', 'success');
    }

    endTest() {
        if (!this.testStarted) return;
        
        this.testStarted = false;
        clearInterval(this.timerInterval);
        
        document.getElementById('testInterface').classList.add('hidden');
        document.getElementById('studentSetup').style.display = 'block';
        
        this.showNotification('🛑 Test diakhiri!', 'info');
    }

    startTimer(duration) {
        this.timeRemaining = duration;
        const timerElement = document.getElementById('timer');
        const timeLeftElement = document.getElementById('timeLeft');

        const updateTimer = () => {
            const hours = Math.floor(this.timeRemaining / 3600);
            const minutes = Math.floor((this.timeRemaining % 3600) / 60);
            const seconds = this.timeRemaining % 60;

            const timeString = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
            
            timerElement.textContent = timeString;
            if (timeLeftElement) timeLeftElement.textContent = `Waktu: ${timeString}`;

            if (this.timeRemaining <= 0) {
                clearInterval(this.timerInterval);
                this.showNotification('⏰ Waktu habis! Test otomatis dikumpulkan', 'warning');
                this.submitTest();
                return;
            }
            
            this.timeRemaining--;
        };

        updateTimer();
        this.timerInterval = setInterval(updateTimer, 1000);
    }

    showQuestion(index) {
        if (index < 0 || index >= this.currentQuestions.length) return;
        
        this.currentQuestionIndex = index;
        const question = this.currentQuestions[index];
        
        // Update question counter
        document.getElementById('currentQuestion').textContent = 
            `Soal ${index + 1}/${this.currentQuestions.length}`;
        
        document.getElementById('testSubject').textContent = 
            `Mata Pelajaran: ${this.getSubjectDisplayName(this.currentSubject)}`;
        
        // Display question
        const container = document.getElementById('questionContainer');
        container.innerHTML = this.createQuestionHTML(question, index);
        
        // Load saved answer if exists
        if (this.studentAnswers[question.id]) {
            const answerElement = document.getElementById(`answer_${question.id}`);
            if (answerElement) {
                answerElement.value = this.studentAnswers[question.id];
            }
        }
    }

    createQuestionHTML(question, index) {
        const isCoding = question.type === 'coding';
        const savedAnswer = this.studentAnswers[question.id] || '';
        
        return `
            <div class="question" data-question-id="${question.id}">
                <h4>Soal ${index + 1} - ${isCoding ? 'Coding' : 'Esai'} (${question.points} poin)</h4>
                <div class="question-text">${this.formatQuestionText(question.question)}</div>
                
                ${isCoding ? 
                    `<div class="code-section">
                         <label for="answer_${question.id}">Jawaban Coding:</label>
                         <textarea class="code-editor" id="answer_${question.id}" 
                                   placeholder="Tulis kode JavaScript atau SQL Anda di sini..."
                                   spellcheck="false">${savedAnswer}</textarea>
                         <div class="code-actions">
                             <button onclick="app.runCode(${question.id})" class="btn btn-info">
                                 <i class="fas fa-play"></i> Jalankan Code
                             </button>
                             <button onclick="app.formatCode(${question.id})" class="btn btn-secondary">
                                 <i class="fas fa-indent"></i> Format Code
                             </button>
                         </div>
                         <div id="output_${question.id}" class="output-container">
                             Output akan muncul di sini...
                         </div>
                     </div>` :
                    `<div class="essay-section">
                         <label for="answer_${question.id}">Jawaban Esai:</label>
                         <textarea class="essay-answer" id="answer_${question.id}" 
                                   placeholder="Tulis jawaban esai Anda di sini...">${savedAnswer}</textarea>
                     </div>`
                }
                
                <div class="question-actions">
                    <button onclick="app.saveAnswer(${question.id})" class="btn btn-success">
                        <i class="fas fa-save"></i> Simpan Jawaban
                    </button>
                    <span class="auto-save-notice">(Otomatis tersimpan saat mengetik)</span>
                </div>
            </div>
        `;
    }

    formatQuestionText(text) {
        // Convert line breaks to HTML
        return text.replace(/\n/g, '<br>');
    }

    saveAnswer(questionId) {
        const answerElement = document.getElementById(`answer_${questionId}`);
        if (answerElement) {
            this.studentAnswers[questionId] = answerElement.value;
            this.showNotification('💾 Jawaban disimpan!', 'success');
        }
    }

    async runCode(questionId) {
        const code = document.getElementById(`answer_${questionId}`).value;
        const outputElement = document.getElementById(`output_${questionId}`);
        
        if (!code.trim()) {
            outputElement.innerHTML = '<span style="color: orange;">⚠️ Tidak ada kode untuk dijalankan</span>';
            return;
        }

        outputElement.innerHTML = '<span style="color: blue;">🔄 Menjalankan kode...</span>';
        this.saveAnswer(questionId); // Auto-save before running
        
        try {
            // Simulate code execution delay
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            let result = '';
            
            try {
                // Simple code execution simulation
                if (code.includes('SELECT') || code.includes('INSERT') || code.includes('UPDATE')) {
                    // SQL-like code
                    result = this.executeSQL(code);
                } else {
                    // JavaScript code
                    const logs = [];
                    const originalLog = console.log;
                    console.log = (...args) => logs.push(args.join(' '));
                    
                    // Use Function constructor for safer execution
                    const func = new Function(code);
                    func();
                    
                    console.log = originalLog;
                    result = logs.join('\n') || '✅ Kode berhasil dijalankan (tidak ada output)';
                }
            } catch (error) {
                result = `❌ Error: ${error.message}`;
            }
            
            outputElement.innerHTML = `<pre style="color: #00ff00;">${result}</pre>`;
            
        } catch (error) {
            outputElement.innerHTML = `<span style="color: red;">❌ Runtime Error: ${error.message}</span>`;
        }
    }

    executeSQL(code) {
        // Simple SQL simulation
        const sql = code.toUpperCase();
        
        if (sql.includes('SELECT')) {
            if (sql.includes('FROM MAHASISWA')) {
                return `ID | NAMA      | KELAS
1  | Andi      | XII RPL 1
2  | Budi      | XII RPL 1
3  | Citra     | XII RPL 2
✅ Query berhasil - 3 data ditemukan`;
            }
            return '✅ Query berhasil - data ditampilkan';
        }
        
        if (sql.includes('INSERT')) {
            return '✅ Data berhasil ditambahkan';
        }
        
        if (sql.includes('UPDATE')) {
            return '✅ Data berhasil diperbarui';
        }
        
        if (sql.includes('DELETE')) {
            return '✅ Data berhasil dihapus';
        }
        
        return '❌ Error: Query tidak dikenali';
    }

    formatCode(questionId) {
        const textarea = document.getElementById(`answer_${questionId}`);
        const code = textarea.value;
        
        // Simple formatting - add proper indentation
        const formatted = code
            .replace(/\{/g, ' {\n    ')
            .replace(/\}/g, '\n}')
            .replace(/;/g, ';\n')
            .replace(/\n\s*\n/g, '\n');
            
        textarea.value = formatted;
        this.saveAnswer(questionId);
        this.showNotification('✨ Code diformat!', 'success');
    }

    nextQuestion() {
        if (this.currentQuestionIndex < this.currentQuestions.length - 1) {
            this.showQuestion(this.currentQuestionIndex + 1);
        } else {
            this.showNotification('🎉 Ini adalah soal terakhir', 'info');
        }
    }

    previousQuestion() {
        if (this.currentQuestionIndex > 0) {
            this.showQuestion(this.currentQuestionIndex - 1);
        }
    }

    async submitTest() {
        if (!this.testStarted) return;
        
        if (!confirm('Apakah Anda yakin ingin mengumpulkan test? Pastikan semua jawaban sudah disimpan.')) {
            return;
        }
        
        this.showLoading(true);
        
        try {
            const scoreResult = await this.calculateScore();
            this.showResults(scoreResult);
            
        } catch (error) {
            console.error('Error submitting test:', error);
            this.showNotification('❌ Gagal mengumpulkan test', 'error');
        } finally {
            this.showLoading(false);
            this.endTest();
        }
    }

    async calculateScore() {
        if (!this.currentStudent || !this.currentSubject) {
            throw new Error('Data siswa atau mata pelajaran tidak lengkap');
        }
        
        const payload = {
            studentId: parseInt(this.currentStudent),
            subject: this.currentSubject,
            answers: this.studentAnswers,
            questions: this.currentQuestions,
            timeUsed: 7200 - this.timeRemaining // Time used in seconds
        };

        const response = await fetch(`${this.apiBaseUrl}/scores/calculate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            throw new Error('Gagal menghitung nilai');
        }

        return await response.json();
    }

    showResults(result) {
        document.getElementById('testInterface').classList.add('hidden');
        document.getElementById('resultContainer').classList.remove('hidden');
        
        const studentName = this.getStudentName(this.currentStudent);
        const subjectName = this.getSubjectDisplayName(this.currentSubject);
        
        const container = document.getElementById('resultContainer');
        container.innerHTML = `
            <div class="result-header">
                <h2><i class="fas fa-trophy"></i> Hasil Test</h2>
                <p><strong>${studentName}</strong> - ${subjectName}</p>
                <p>Waktu digunakan: ${this.formatTime(result.timeUsed)}</p>
            </div>
            
            <div class="score-display">
                ${result.finalScore.toFixed(2)}
                <div class="score-label">Nilai Akhir</div>
            </div>
            
            <div class="result-details">
                <h4><i class="fas fa-list-ol"></i> Detail Nilai:</h4>
                <table style="width: 100%; border-collapse: collapse; margin: 15px 0;">
                    <thead>
                        <tr style="background: var(--primary-color); color: white;">
                            <th style="padding: 12px; text-align: left;">Soal</th>
                            <th style="padding: 12px; text-align: center;">Tipe</th>
                            <th style="padding: 12px; text-align: center;">Poin</th>
                            <th style="padding: 12px; text-align: center;">Nilai</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${result.questionScores.map((qs, index) => `
                            <tr style="border-bottom: 1px solid var(--border-color);">
                                <td style="padding: 10px;">Soal ${index + 1}</td>
                                <td style="padding: 10px; text-align: center;">
                                    <span class="badge ${qs.type === 'coding' ? 'badge-info' : 'badge-warning'}">
                                        ${qs.type}
                                    </span>
                                </td>
                                <td style="padding: 10px; text-align: center;">${qs.maxScore}</td>
                                <td style="padding: 10px; text-align: center; font-weight: bold;">
                                    ${qs.score.toFixed(1)}
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
                
                <div style="margin-top: 20px; padding: 20px; background: linear-gradient(135deg, #d4edda, #c3e6cb); border-radius: 10px; text-align: center;">
                    <div style="font-size: 1.2em; margin-bottom: 10px;">
                        <strong>Total: ${result.totalScore} / ${result.maxScore}</strong>
                    </div>
                    <div style="font-size: 1.5em; font-weight: bold; color: var(--success-color);">
                        Nilai Akhir: ${result.finalScore.toFixed(2)}
                    </div>
                    <div style="margin-top: 10px; font-size: 0.9em; color: #155724;">
                        ${this.getScoreMessage(result.finalScore)}
                    </div>
                </div>
            </div>
            
            <div class="result-actions" style="margin-top: 30px;">
                <button onclick="app.restartTest()" class="btn btn-primary">
                    <i class="fas fa-redo"></i> Test Lagi
                </button>
                <button onclick="app.printResults()" class="btn btn-secondary">
                    <i class="fas fa-print"></i> Print Hasil
                </button>
                <button onclick="location.reload()" class="btn btn-info">
                    <i class="fas fa-home"></i> Kembali ke Menu
                </button>
            </div>
        `;
    }

    getScoreMessage(score) {
        if (score >= 85) return '🎉 Excellent! Pertahankan prestasimu!';
        if (score >= 70) return '👍 Bagus! Tingkatkan lagi!';
        if (score >= 60) return '💪 Cukup baik, butuh lebih banyak latihan';
        return '📚 Perlu belajar lebih giat lagi';
    }

    formatTime(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }

    restartTest() {
        document.getElementById('resultContainer').classList.add('hidden');
        document.getElementById('studentSetup').style.display = 'block';
        this.studentAnswers = {};
        this.currentQuestionIndex = 0;
    }

    printResults() {
        window.print();
    }

    // Admin Management Functions
    showAdminModal() {
        document.getElementById('adminModal').classList.remove('hidden');
        this.showTab('students');
        this.loadStudentsList();
    }

    hideAdminModal() {
        document.getElementById('adminModal').classList.add('hidden');
    }

    showTab(tabName) {
        // Hide all tabs
        document.querySelectorAll('.tab-content').forEach(tab => {
            tab.classList.add('hidden');
        });
        
        // Remove active class from all buttons
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        // Show selected tab
        document.getElementById(`${tabName}Tab`).classList.remove('hidden');
        event.target.classList.add('active');

        // Load data for the tab
        if (tabName === 'questions') {
            this.loadQuestionsList();
        } else if (tabName === 'results') {
            this.loadResults();
        }
    }

    toggleQuestionFields(type) {
        document.getElementById('codingFields').classList.toggle('hidden', type !== 'coding');
        document.getElementById('essayFields').classList.toggle('hidden', type !== 'essay');
    }

    async addStudent() {
        const name = document.getElementById('newStudentName').value.trim();
        const className = document.getElementById('newStudentClass').value.trim();
        const nis = document.getElementById('newStudentNIS').value.trim();
        
        if (!name || !className || !nis) {
            this.showNotification('❌ Nama, kelas, dan NIS harus diisi', 'warning');
            return;
        }

        try {
            const response = await fetch(`${this.apiBaseUrl}/students`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    name: name,
                    class: className,
                    nis: nis
                })
            });

            if (response.ok) {
                this.showNotification('✅ Siswa berhasil ditambahkan', 'success');
                document.getElementById('newStudentName').value = '';
                document.getElementById('newStudentClass').value = '';
                document.getElementById('newStudentNIS').value = '';
                await this.loadStudents();
                await this.loadStudentsList();
            } else {
                throw new Error('Gagal menambah siswa');
            }
        } catch (error) {
            this.showNotification('❌ Gagal menambah siswa', 'error');
        }
    }

    async addQuestion() {
        const subject = document.getElementById('questionSubject').value;
        const type = document.getElementById('questionType').value;
        const questionText = document.getElementById('questionText').value.trim();
        const points = parseInt(document.getElementById('questionPoints').value);

        if (!questionText || !points || points <= 0) {
            this.showNotification('❌ Pertanyaan dan poin harus diisi dengan benar', 'warning');
            return;
        }

        const questionData = {
            subject: subject,
            type: type,
            question: questionText,
            points: points
        };

        if (type === 'coding') {
            questionData.code_template = document.getElementById('codeTemplate').value;
            questionData.test_cases = this.parseTestCases(document.getElementById('testCases').value);
        } else {
            const answerKey = document.getElementById('answerKey').value;
            questionData.answer_key = answerKey.split(',').map(k => k.trim()).filter(k => k);
        }

        try {
            const response = await fetch(`${this.apiBaseUrl}/questions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(questionData)
            });

            if (response.ok) {
                this.showNotification('✅ Soal berhasil ditambahkan', 'success');
                this.clearQuestionForm();
                await this.loadQuestionsList();
            } else {
                throw new Error('Gagal menambah soal');
            }
        } catch (error) {
            this.showNotification('❌ Gagal menambah soal', 'error');
        }
    }

    parseTestCases(testCasesText) {
        try {
            if (!testCasesText.trim()) {
                return [{ input: '', expected: 'Output yang diharapkan' }];
            }
            return JSON.parse(testCasesText);
        } catch (error) {
            this.showNotification('❌ Format test cases tidak valid. Gunakan format JSON.', 'error');
            return [{ input: '', expected: 'Output yang diharapkan' }];
        }
    }

    clearQuestionForm() {
        document.getElementById('questionText').value = '';
        document.getElementById('codeTemplate').value = '';
        document.getElementById('testCases').value = '';
        document.getElementById('answerKey').value = '';
        document.getElementById('questionPoints').value = '10';
    }

    async loadStudentsList() {
        try {
            const response = await fetch(`${this.apiBaseUrl}/students`);
            const data = await response.json();
            
            const container = document.getElementById('studentsList');
            container.innerHTML = data.students.map(student => `
                <div class="student-item">
                    <div class="student-info">
                        <strong>${student.name}</strong><br>
                        <small>Kelas: ${student.class} | NIS: ${student.nis}</small>
                    </div>
                    <button onclick="app.deleteStudent(${student.id})" class="btn btn-danger btn-sm">
                        <i class="fas fa-trash"></i> Hapus
                    </button>
                </div>
            `).join('');
        } catch (error) {
            console.error('Error loading students list:', error);
            document.getElementById('studentsList').innerHTML = '<p>Gagal memuat data siswa</p>';
        }
    }

    async loadQuestionsList() {
        try {
            const subjects = ['basis_data', 'ppl', 'pwpb', 'pbo'];
            let allQuestions = [];
            
            for (const subject of subjects) {
                const response = await fetch(`${this.apiBaseUrl}/questions/${subject}`);
                const data = await response.json();
                if (data.questions) {
                    allQuestions = allQuestions.concat(
                        data.questions.map(q => ({...q, subject}))
                    );
                }
            }
            
            const container = document.getElementById('questionsList');
            
            if (allQuestions.length === 0) {
                container.innerHTML = '<p>Belum ada soal. Tambahkan soal baru.</p>';
                return;
            }
            
            container.innerHTML = allQuestions.map(question => `
                <div class="question-item">
                    <div class="question-info">
                        <strong>${this.getSubjectDisplayName(question.subject)} - ${question.type}</strong>
                        <p>${question.question.substring(0, 100)}${question.question.length > 100 ? '...' : ''}</p>
                        <small>Poin: ${question.points} | ID: ${question.id}</small>
                    </div>
                    <button onclick="app.deleteQuestion('${question.subject}', ${question.id})" 
                            class="btn btn-danger btn-sm">
                        <i class="fas fa-trash"></i> Hapus
                    </button>
                </div>
            `).join('');
        } catch (error) {
            console.error('Error loading questions list:', error);
            document.getElementById('questionsList').innerHTML = '<p>Gagal memuat data soal</p>';
        }
    }

    async loadResults() {
        try {
            const subject = document.getElementById('resultsSubject').value;
            const response = await fetch(`${this.apiBaseUrl}/scores/results${subject !== 'all' ? `?subject=${subject}` : ''}`);
            const data = await response.json();
            
            const container = document.getElementById('resultsList');
            
            if (!data.results || data.results.length === 0) {
                container.innerHTML = '<p>Belum ada hasil test.</p>';
                return;
            }
            
            container.innerHTML = data.results.map(result => `
                <div class="result-item">
                    <div class="result-info">
                        <strong>${result.studentName} - ${result.studentClass}</strong><br>
                        <small>Mata Pelajaran: ${this.getSubjectDisplayName(result.subject)}</small><br>
                        <small>Waktu: ${new Date(result.timestamp).toLocaleString()}</small>
                    </div>
                    <div class="result-score">
                        <strong>${result.finalScore.toFixed(2)}</strong>
                    </div>
                </div>
            `).join('');
        } catch (error) {
            console.error('Error loading results:', error);
            document.getElementById('resultsList').innerHTML = '<p>Gagal memuat hasil test</p>';
        }
    }

    async deleteStudent(studentId) {
        if (!confirm('Apakah Anda yakin ingin menghapus siswa ini?')) return;
        
        try {
            const response = await fetch(`${this.apiBaseUrl}/students/${studentId}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                this.showNotification('✅ Siswa berhasil dihapus', 'success');
                await this.loadStudents();
                await this.loadStudentsList();
            } else {
                throw new Error('Gagal menghapus siswa');
            }
        } catch (error) {
            this.showNotification('❌ Gagal menghapus siswa', 'error');
        }
    }

    async deleteQuestion(subject, questionId) {
        if (!confirm('Apakah Anda yakin ingin menghapus soal ini?')) return;
        
        try {
            const response = await fetch(`${this.apiBaseUrl}/questions/${subject}/${questionId}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                this.showNotification('✅ Soal berhasil dihapus', 'success');
                await this.loadQuestionsList();
            } else {
                throw new Error('Gagal menghapus soal');
            }
        } catch (error) {
            this.showNotification('❌ Gagal menghapus soal', 'error');
        }
    }

    async exportResults() {
        try {
            this.showLoading(true);
            const response = await fetch(`${this.apiBaseUrl}/scores/export`);
            const blob = await response.blob();
            
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `hasil-test-${new Date().toISOString().split('T')[0]}.xlsx`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            
            this.showNotification('✅ Hasil berhasil diexport', 'success');
        } catch (error) {
            this.showNotification('❌ Gagal mengekspor hasil', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    // Utility Methods
    getStudentName(studentId) {
        const select = document.getElementById('studentSelect');
        const option = select.querySelector(`option[value="${studentId}"]`);
        return option ? option.textContent.split(' - ')[0] : 'Siswa Tidak Dikenal';
    }

    getSubjectDisplayName(subject) {
        const subjects = {
            'basis_data': 'Basis Data',
            'ppl': 'PPL (Pengembangan Perangkat Lunak)',
            'pwpb': 'PWPB (Pemrograman Web dan Perangkat Bergerak)',
            'pbo': 'PBO (Pemrograman Berorientasi Objek)'
        };
        return subjects[subject] || subject;
    }

    showLoading(show) {
        document.getElementById('loading').classList.toggle('hidden', !show);
    }

    showNotification(message, type = 'info') {
        // Remove existing notification
        const existingNotification = document.querySelector('.notification');
        if (existingNotification) {
            existingNotification.remove();
        }

        // Create new notification
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <i class="fas fa-${this.getNotificationIcon(type)}"></i>
            ${message}
        `;
        
        document.body.appendChild(notification);
        
        // Auto remove after 5 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 5000);
    }

    getNotificationIcon(type) {
        const icons = {
            'success': 'check-circle',
            'error': 'exclamation-circle',
            'warning': 'exclamation-triangle',
            'info': 'info-circle'
        };
        return icons[type] || 'info-circle';
    }
}

// Initialize application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.app = new App();
    console.log('🎯 Sistem Latihan Soal siap digunakan!');
});

// Global functions for HTML onclick
function startTest() { window.app.startTest(); }
function endTest() { window.app.endTest(); }
function showAdminModal() { window.app.showAdminModal(); }
function exportResults() { window.app.exportResults(); }
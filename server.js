const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs').promises;

// Import routes
const studentRoutes = require('./backend/routes/students');
const questionRoutes = require('./backend/routes/questions');
const scoreRoutes = require('./backend/routes/scores');

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS untuk semua origin di production
app.use(cors({
    origin: true, // Allow semua origin
    credentials: true
}));

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve static files
app.use(express.static(path.join(__dirname)));
app.use('/assets', express.static(path.join(__dirname, 'assets')));
app.use('/backend/data', express.static(path.join(__dirname, 'backend/data')));

// API Routes
app.use('/api/students', studentRoutes);
app.use('/api/questions', questionRoutes);
app.use('/api/scores', scoreRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        message: 'Server is running in production',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development'
    });
});

// Serve main page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Handle 404
app.use('*', (req, res) => {
    res.status(404).json({ error: 'Endpoint not found' });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Server Error:', err);
    res.status(500).json({ error: 'Internal server error' });
});

// Initialize data directory
async function initializeData() {
    try {
        const dataDir = path.join(__dirname, 'backend/data');
        await fs.mkdir(dataDir, { recursive: true });
        
        // Create default data files if they don't exist
        const defaultFiles = {
            'students.json': JSON.stringify({
                students: [
                    {
                        id: 1,
                        name: "Andi Wijaya",
                        class: "XII RPL 1",
                        nis: "2024001",
                        createdAt: new Date().toISOString()
                    },
                    {
                        id: 2,
                        name: "Budi Santoso", 
                        class: "XII RPL 1",
                        nis: "2024002",
                        createdAt: new Date().toISOString()
                    }
                ]
            }, null, 2),
            
            'questions.json': JSON.stringify({
                basis_data: [
                    {
                        id: 1,
                        type: "coding",
                        question: "Buat query SQL untuk menampilkan semua data dari tabel 'mahasiswa'",
                        points: 20,
                        code_template: "SELECT * FROM mahasiswa;",
                        test_cases: [{ input: "", expected: "Data mahasiswa berhasil ditampilkan" }],
                        createdAt: new Date().toISOString()
                    }
                ],
                ppl: [],
                pwpb: [],
                pbo: []
            }, null, 2),
            
            'results.json': JSON.stringify({ results: [] }, null, 2)
        };

        for (const [filename, content] of Object.entries(defaultFiles)) {
            const filePath = path.join(dataDir, filename);
            try {
                await fs.access(filePath);
            } catch {
                await fs.writeFile(filePath, content);
                console.log(`✅ Created default ${filename}`);
            }
        }
    } catch (error) {
        console.error('Error initializing data:', error);
    }
}

// Start server
initializeData().then(() => {
    app.listen(PORT, '0.0.0.0', () => {
        console.log(`🚀 Server berjalan di port ${PORT}`);
        console.log(`🌐 Production Mode: Bisa diakses dari device mana saja`);
        console.log(`📚 Sistem Latihan Soal Coding & Esai`);
        console.log(`⏰ ${new Date().toString()}`);
        console.log(`📍 URL: http://localhost:${PORT}`);
    });
});

module.exports = app;
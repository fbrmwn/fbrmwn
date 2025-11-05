// setup.js - Script untuk setup awal
const fs = require('fs');
const path = require('path');

console.log('🚀 Setting up Latihan Soal System...');

// Check if all required folders exist
const folders = [
    'css',
    'js', 
    'backend/routes',
    'backend/controllers',
    'backend/models',
    'backend/middleware',
    'backend/data',
    'assets/images',
    'assets/icons',
    'assets/fonts',
    'docs'
];

folders.forEach(folder => {
    const folderPath = path.join(__dirname, folder);
    if (!fs.existsSync(folderPath)) {
        fs.mkdirSync(folderPath, { recursive: true });
        console.log(`✅ Created folder: ${folder}`);
    }
});

console.log('✅ Setup completed!');
console.log('📁 Folder structure ready');
console.log('🎯 Run: npm install && npm start');
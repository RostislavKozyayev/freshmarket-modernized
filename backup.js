// backup.js
const fs = require('fs');
const path = require('path');

const DB_FILE = './freshmarket.db';
const BACKUP_DIR = './backups';
const DATE = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const BACKUP_FILE = path.join(BACKUP_DIR, `freshmarket_${DATE}.db`);

// Создаём папку для бэкапов, если нет
if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
    console.log('📁 Создана папка для резервных копий:', BACKUP_DIR);
}

// Проверяем существование базы данных
if (!fs.existsSync(DB_FILE)) {
    console.error('❌ Ошибка: Файл базы данных не найден:', DB_FILE);
    console.error('   Сначала запустите seed.js для создания БД');
    process.exit(1);
}

// Копируем файл базы данных
try {
    fs.copyFileSync(DB_FILE, BACKUP_FILE);
    
    // Получаем размер файла
    const stats = fs.statSync(BACKUP_FILE);
    const size = (stats.size / 1024).toFixed(2);
    
    console.log('✅ Резервная копия успешно создана!');
    console.log(`📦 Файл: ${BACKUP_FILE}`);
    console.log(`📊 Размер: ${size} КБ`);
    console.log(`🕐 Дата: ${DATE}`);
} catch (err) {
    console.error('❌ Ошибка при создании резервной копии:', err.message);
    process.exit(1);
}
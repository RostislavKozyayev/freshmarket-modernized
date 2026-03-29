// restore.js
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const DB_FILE = './freshmarket.db';
const BACKUP_DIR = './backups';

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

// Получаем список доступных бэкапов
function getBackups() {
    if (!fs.existsSync(BACKUP_DIR)) {
        return [];
    }
    return fs.readdirSync(BACKUP_DIR)
        .filter(file => file.endsWith('.db'))
        .sort()
        .reverse();
}

// Основная функция
async function restore() {
    const backups = getBackups();
    
    if (backups.length === 0) {
        console.error('❌ Ошибка: Резервные копии не найдены в папке', BACKUP_DIR);
        process.exit(1);
    }
    
    console.log('📦 Доступные резервные копии:\n');
    backups.forEach((backup, index) => {
        const filePath = path.join(BACKUP_DIR, backup);
        const stats = fs.statSync(filePath);
        const size = (stats.size / 1024).toFixed(2);
        console.log(`   ${index + 1}) ${backup} (${size} КБ)`);
    });
    
    console.log('\n0) Отмена');
    
    rl.question('\nВыберите номер копии для восстановления: ', (answer) => {
        const choice = parseInt(answer);
        
        if (choice === 0) {
            console.log('⚠️ Операция отменена');
            rl.close();
            return;
        }
        
        if (isNaN(choice) || choice < 1 || choice > backups.length) {
            console.error('❌ Неверный номер');
            rl.close();
            return;
        }
        
        const selectedBackup = backups[choice - 1];
        const backupPath = path.join(BACKUP_DIR, selectedBackup);
        
        // Создаём резервную копию текущей БД перед восстановлением
        if (fs.existsSync(DB_FILE)) {
            const preRestoreBackup = `./freshmarket_pre_restore_${Date.now()}.db`;
            fs.copyFileSync(DB_FILE, preRestoreBackup);
            console.log(`💾 Текущая БД сохранена: ${preRestoreBackup}`);
        }
        
        // Восстанавливаем из выбранной копии
        try {
            fs.copyFileSync(backupPath, DB_FILE);
            console.log('✅ Восстановление успешно завершено!');
            console.log(`📁 Восстановлено из: ${selectedBackup}`);
        } catch (err) {
            console.error('❌ Ошибка при восстановлении:', err.message);
            process.exit(1);
        }
        
        rl.close();
    });
}

restore();
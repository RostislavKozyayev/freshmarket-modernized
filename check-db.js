const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./freshmarket.db');

console.log('📦 Товары в базе данных:\n');

db.all('SELECT * FROM products', (err, rows) => {
    if (err) {
        console.error('❌ Ошибка:', err.message);
    } else {
        console.table(rows);
        console.log(`\n✅ Всего товаров: ${rows.length}`);
    }
    db.close();
});
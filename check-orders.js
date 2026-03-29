const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./freshmarket.db');

console.log('📦 Заказы в базе данных:\n');

db.all(`
    SELECT o.id, o.total, o.status, o.created_at, u.email as customer
    FROM orders o
    LEFT JOIN users u ON o.user_id = u.id
    ORDER BY o.created_at DESC
`, [], (err, rows) => {
    if (err) {
        console.error('❌ Ошибка:', err.message);
    } else if (rows.length === 0) {
        console.log('⚠️  Заказы пока отсутствуют');
        console.log('   Оформите заказ через каталог, чтобы проверить работу БД');
    } else {
        console.table(rows);
        console.log(`\n✅ Всего заказов: ${rows.length}`);
    }
    db.close();
});
// seed.js
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.join(__dirname, 'freshmarket.db');
const db = new sqlite3.Database(dbPath);

console.log('📁 Путь к базе данных:', dbPath);

// Данные для наполнения (из вашего script.js)
const products = [
    { name: 'Яблоки Голден', price: 199, emoji: '🍎', category: 'fruits', weight: '1 кг', stock: 50 },
    { name: 'Молоко 2.5%', price: 89, emoji: '🥛', category: 'dairy', weight: '1 л', stock: 30 },
    { name: 'Сыр Пармезан', price: 450, emoji: '🧀', category: 'dairy', weight: '200 г', stock: 15 },
    { name: 'Авокадо', price: 159, emoji: '🥑', category: 'fruits', weight: '1 шт', stock: 40 },
    { name: 'Хлеб ржаной', price: 65, emoji: '🍞', category: 'bakery', weight: '500 г', stock: 25 },
    { name: 'Бананы', price: 95, emoji: '🍌', category: 'fruits', weight: '1 кг', stock: 60 },
    { name: 'Кофе молотый', price: 450, emoji: '☕', category: 'drinks', weight: '250 г', stock: 20 },
    { name: 'Шоколад горький', price: 120, emoji: '🍫', category: 'bakery', weight: '100 г', stock: 35 },
];

db.serialize(() => {
    // 1. СОЗДАНИЕ ТАБЛИЦ (если их нет)
    console.log('🔨 Создание таблиц...');
    
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        name TEXT,
        role TEXT DEFAULT 'customer',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        price REAL NOT NULL,
        emoji TEXT,
        category TEXT,
        weight TEXT,
        stock INTEGER DEFAULT 0
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        total REAL NOT NULL,
        status TEXT DEFAULT 'new',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS order_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_id INTEGER,
        product_id INTEGER,
        quantity INTEGER DEFAULT 1,
        price REAL NOT NULL,
        FOREIGN KEY (order_id) REFERENCES orders(id),
        FOREIGN KEY (product_id) REFERENCES products(id)
    )`);

    // 2. ЗАГРУЗКА ДАННЫХ
    console.log('📦 Загрузка товаров...');
    
    const stmt = db.prepare(`INSERT OR REPLACE INTO products (name, price, emoji, category, weight, stock) 
                             VALUES (?, ?, ?, ?, ?, ?)`);
    
    products.forEach(p => {
        stmt.run(p.name, p.price, p.emoji, p.category, p.weight, p.stock);
    });
    
    stmt.finalize(() => {
        console.log('✅ Данные успешно загружены в базу!');
        console.log(`📊 Добавлено товаров: ${products.length}`);
        
        // Проверка количества записей
        db.get('SELECT COUNT(*) as count FROM products', (err, row) => {
            if (!err) console.log(`📈 Всего записей в БД: ${row.count}`);
            
            db.close(() => {
                console.log('🔌 База данных закрыта');
            });
        });
    });
});
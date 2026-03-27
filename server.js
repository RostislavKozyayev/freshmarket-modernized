// server.js
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname))); // Раздача статических файлов (HTML, CSS, JS)

// Подключение к SQLite (файл создастся автоматически)
const db = new sqlite3.Database('./freshmarket.db', (err) => {
    if (err) console.error('❌ Ошибка подключения к БД:', err);
    else console.log('✅ Подключено к базе данных freshmarket.db');
});

// ===== СОЗДАНИЕ ТАБЛИЦ (если их нет) =====
db.serialize(() => {
    // Таблица пользователей
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        name TEXT,
        role TEXT DEFAULT 'customer',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Таблица товаров
    db.run(`CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        price REAL NOT NULL,
        emoji TEXT,
        category TEXT,
        weight TEXT,
        stock INTEGER DEFAULT 0
    )`);

    // Таблица заказов
    db.run(`CREATE TABLE IF NOT EXISTS orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        total REAL NOT NULL,
        status TEXT DEFAULT 'new',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
    )`);

    // Таблица позиций заказа
    db.run(`CREATE TABLE IF NOT EXISTS order_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_id INTEGER,
        product_id INTEGER,
        quantity INTEGER DEFAULT 1,
        price REAL NOT NULL,
        FOREIGN KEY (order_id) REFERENCES orders(id),
        FOREIGN KEY (product_id) REFERENCES products(id)
    )`);
});

// ===== API ENDPOINTS =====

// 📦 Получить все товары
app.get('/api/products', (req, res) => {
    db.all('SELECT * FROM products', [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// 🔐 Авторизация (упрощённая для учебной практики)
app.post('/api/login', (req, res) => {
    const { email, password, role } = req.body;
    
    // Для демо: проверяем только email (в реальности нужно хешировать пароли!)
    db.get('SELECT * FROM users WHERE email = ?', [email], (err, user) => {
        if (err) return res.status(500).json({ error: err.message });
        
        if (user) {
            // Пользователь найден
            res.json({ success: true, user: { email: user.email, role: user.role } });
        } else if (role === 'admin' && email === 'admin@freshmarket.ru' && password === 'admin') {
            // Демо-админ для тестов
            res.json({ success: true, user: { email, role: 'admin' } });
        } else {
            // Создаём нового пользователя (для демо)
            db.run('INSERT INTO users (email, password, role) VALUES (?, ?, ?)', 
                [email, password, role || 'customer'],
                function(err) {
                    if (err) return res.status(500).json({ error: err.message });
                    res.json({ success: true, user: { email, role: role || 'customer' } });
                }
            );
        }
    });
});

// 🛒 Создать заказ
app.post('/api/orders', (req, res) => {
    const { userId, items, total } = req.body;
    
    db.serialize(() => {
        db.run('INSERT INTO orders (user_id, total) VALUES (?, ?)', 
            [userId, total],
            function(err) {
                if (err) return res.status(500).json({ error: err.message });
                const orderId = this.lastID;
                
                // Добавляем позиции заказа
                const stmt = db.prepare('INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (?, ?, ?, ?)');
                items.forEach(item => {
                    stmt.run(orderId, item.id, item.quantity, item.price);
                });
                stmt.finalize();
                
                res.json({ success: true, orderId });
            }
        );
    });
});

// 👤 Получить заказы (для админки)
app.get('/api/orders', (req, res) => {
    db.all(`SELECT o.*, u.email as customer 
            FROM orders o 
            LEFT JOIN users u ON o.user_id = u.id 
            ORDER BY o.created_at DESC`, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// ГЛАВНАЯ СТРАНИЦА (перенаправление на main.html)
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'main.html'));
});

// ===== ЗАПУСК СЕРВЕРА =====
app.listen(PORT, () => {
    console.log(`🚀 Сервер запущен: http://localhost:${PORT}`);
    console.log(`📁 Статические файлы раздаются из: ${path.join(__dirname)}`);
});

// Корректное закрытие БД при остановке
process.on('SIGINT', () => {
    db.close(() => {
        console.log('🔌 База данных закрыта');
        process.exit(0);
    });
});
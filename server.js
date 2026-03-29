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
app.use(express.static(path.join(__dirname)));

// Подключение к SQLite
const db = new sqlite3.Database('./freshmarket.db', (err) => {
    if (err) console.error('❌ Ошибка подключения к БД:', err);
    else console.log('✅ Подключено к базе данных freshmarket.db');
});

// Создание таблиц
db.serialize(() => {
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

    // ✅ Создаём админа и тестового пользователя
    db.run(`INSERT OR IGNORE INTO users (email, password, role, name) 
            VALUES ('admin@freshmarket.ru', 'admin123', 'admin', 'Администратор')`);
    
    db.run(`INSERT OR IGNORE INTO users (email, password, role, name) 
            VALUES ('user@example.com', 'user123', 'customer', 'Тестовый пользователь')`);
});

// ===== API ENDPOINTS =====

// 📦 GET /api/products
app.get('/api/products', (req, res) => {
    db.all('SELECT * FROM products', [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// 📦 POST /api/products (Admin)
app.post('/api/products', (req, res) => {
    const { name, price, emoji, category, weight, stock } = req.body;
    db.run(
        `INSERT INTO products (name, price, emoji, category, weight, stock) VALUES (?, ?, ?, ?, ?, ?)`,
        [name, price, emoji, category, weight, stock || 0],
        function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true, id: this.lastID });
        }
    );
});

// 📦 PUT /api/products/:id (Admin)
app.put('/api/products/:id', (req, res) => {
    const { name, price, emoji, category, weight, stock } = req.body;
    db.run(
        `UPDATE products SET name=?, price=?, emoji=?, category=?, weight=?, stock=? WHERE id=?`,
        [name, price, emoji, category, weight, stock, req.params.id],
        function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true, changes: this.changes });
        }
    );
});

// 📦 DELETE /api/products/:id (Admin)
app.delete('/api/products/:id', (req, res) => {
    db.run(`DELETE FROM products WHERE id=?`, [req.params.id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true, changes: this.changes });
    });
});

// 🔐 POST /api/login (ИСПРАВЛЕНО)
app.post('/api/login', (req, res) => {
    const { email, password, role } = req.body;
    
    // ✅ Строгая проверка для админа
    if (role === 'admin') {
        if (email !== 'admin@freshmarket.ru' || password !== 'admin123') {
            return res.status(401).json({ 
                success: false, 
                message: 'Неверный логин или пароль администратора' 
            });
        }
        return res.json({ 
            success: true, 
            user: { email: 'admin@freshmarket.ru', role: 'admin' } 
        });
    }
    
    // ✅ Проверка для покупателя через БД
    db.get('SELECT * FROM users WHERE email = ? AND password = ? AND role = ?', 
        [email, password, 'customer'], 
        (err, user) => {
            if (err) return res.status(500).json({ error: err.message });
            
            if (user) {
                res.json({ 
                    success: true, 
                    user: { email: user.email, role: user.role } 
                });
            } else {
                res.status(401).json({ 
                    success: false, 
                    message: 'Неверный логин или пароль' 
                });
            }
        }
    );
});

// 🔐 POST /api/register (НОВЫЙ)
app.post('/api/register', (req, res) => {
    const { name, email, password, role } = req.body;
    
    if (!email || !password) {
        return res.status(400).json({ 
            success: false, 
            message: 'Email и пароль обязательны' 
        });
    }
    
    db.run(
        'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
        [name || '', email, password, role || 'customer'],
        function(err) {
            if (err) {
                if (err.message.includes('UNIQUE constraint failed')) {
                    return res.status(400).json({ 
                        success: false, 
                        message: 'Email уже зарегистрирован' 
                    });
                }
                return res.status(500).json({ 
                    success: false, 
                    message: 'Ошибка сервера' 
                });
            }
            res.json({ 
                success: true, 
                user: { email, role: role || 'customer' },
                id: this.lastID 
            });
        }
    );
});

// 🛒 POST /api/orders
app.post('/api/orders', (req, res) => {
    const { userId, items, total } = req.body;
    db.serialize(() => {
        db.run('INSERT INTO orders (user_id, total) VALUES (?, ?)', [userId, total], function(err) {
            if (err) return res.status(500).json({ error: err.message });
            const orderId = this.lastID;
            const stmt = db.prepare('INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (?, ?, ?, ?)');
            items.forEach(item => {
                stmt.run(orderId, item.id, item.quantity, item.price);
            });
            stmt.finalize();
            res.json({ success: true, orderId });
        });
    });
});

// 🛒 GET /api/orders (Admin)
app.get('/api/orders', (req, res) => {
    db.all(`SELECT o.*, u.email as customer FROM orders o LEFT JOIN users u ON o.user_id = u.id ORDER BY o.created_at DESC`, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// 🛒 PUT /api/orders/:id/status (Admin)
app.put('/api/orders/:id/status', (req, res) => {
    const { status } = req.body;
    db.run(`UPDATE orders SET status=? WHERE id=?`, [status, req.params.id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

// ===== ЗАПУСК СЕРВЕРА =====
app.listen(PORT, () => {
    console.log(`🚀 Сервер запущен: http://localhost:${PORT}/main.html`);
});

process.on('SIGINT', () => {
    db.close(() => {
        console.log('🔌 База данных закрыта');
        process.exit(0);
    });
});
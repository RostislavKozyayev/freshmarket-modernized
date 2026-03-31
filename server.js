// server.js
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcrypt');

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

// Включение внешних ключей
db.run('PRAGMA foreign_keys = ON');

// Логирование ошибок
function logError(context, error) {
    const timestamp = new Date().toISOString();
    console.error(`[${timestamp}] ${context}:`, error?.message || error);
}

// Middleware проверки авторизации
function requireAdmin(req, res, next) {
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ success: false, message: 'Требуется авторизация' });
    }
    const token = authHeader.substring(7);
    try {
        const userData = JSON.parse(Buffer.from(token, 'base64').toString('utf-8'));
        if (userData.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Доступ запрещён' });
        }
        req.user = userData;
        next();
    } catch (e) {
        return res.status(401).json({ success: false, message: 'Неверный токен' });
    }
}

// Валидация данных товара
function validateProduct(data) {
    const errors = [];
    if (!data.name || typeof data.name !== 'string' || data.name.trim().length < 2) {
        errors.push('Название должно содержать минимум 2 символа');
    }
    if (typeof data.price !== 'number' || data.price < 0 || data.price > 1000000) {
        errors.push('Цена должна быть числом от 0 до 1000000');
    }
    if (data.stock !== undefined && (typeof data.stock !== 'number' || data.stock < 0)) {
        errors.push('Количество должно быть неотрицательным числом');
    }
    if (data.category && !['fruits', 'dairy', 'bakery', 'drinks', 'other'].includes(data.category)) {
        errors.push('Недопустимая категория');
    }
    return errors;
}

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
        FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    )`);
    
    // Создание админа
    bcrypt.hash('admin123', 10, (err, hash) => {
        if (!err) {
            db.run(`INSERT OR IGNORE INTO users (email, password, role, name) VALUES ('admin@freshmarket.ru', ?, 'admin', 'Администратор')`, [hash]);
        }
    });
});

// ===== API ENDPOINTS =====

// 📦 GET /api/products
app.get('/api/products', (req, res) => {
    db.all('SELECT id, name, price, emoji, category, weight, stock FROM products', [], (err, rows) => {
        if (err) {
            logError('Ошибка получения товаров', err);
            return res.status(500).json({ error: 'Внутренняя ошибка сервера' });
        }
        res.json(rows);
    });
});

// 📦 POST /api/products (Admin)
app.post('/api/products', requireAdmin, (req, res) => {
    const { name, price, emoji, category, weight, stock } = req.body;
    const errors = validateProduct({ name, price, stock, category });
    if (errors.length > 0) {
        return res.status(400).json({ success: false, errors });
    }
    db.run(`INSERT INTO products (name, price, emoji, category, weight, stock) VALUES (?, ?, ?, ?, ?, ?)`,
        [name.trim(), price, emoji || '📦', category || 'other', weight || '1 шт', stock || 0],
        function(err) {
            if (err) {
                logError('Ошибка добавления товара', err);
                return res.status(500).json({ success: false, message: 'Ошибка при сохранении' });
            }
            res.json({ success: true, id: this.lastID });
        }
    );
});

// 📦 PUT /api/products/:id (Admin)
app.put('/api/products/:id', requireAdmin, (req, res) => {
    const { name, price, emoji, category, weight, stock } = req.body;
    const errors = validateProduct({ name, price, stock, category });
    if (errors.length > 0) {
        return res.status(400).json({ success: false, errors });
    }
    db.run(`UPDATE products SET name=?, price=?, emoji=?, category=?, weight=?, stock=? WHERE id=?`,
        [name.trim(), price, emoji, category, weight, stock, req.params.id],
        function(err) {
            if (err) {
                logError('Ошибка обновления товара', err);
                return res.status(500).json({ success: false, message: 'Ошибка при обновлении' });
            }
            res.json({ success: true, changes: this.changes });
        }
    );
});

// 📦 DELETE /api/products/:id (Admin)
app.delete('/api/products/:id', requireAdmin, (req, res) => {
    db.run(`DELETE FROM products WHERE id=?`, [req.params.id], function(err) {
        if (err) {
            logError('Ошибка удаления товара', err);
            return res.status(500).json({ success: false, message: 'Ошибка при удалении' });
        }
        res.json({ success: true, changes: this.changes });
    });
});

// 🔐 POST /api/login
app.post('/api/login', (req, res) => {
    const { email, password, role } = req.body;
    if (role === 'admin') {
        db.get('SELECT * FROM users WHERE email = ? AND role = ?', [email, 'admin'], (err, user) => {
            if (err) {
                logError('Ошибка входа админа', err);
                return res.status(500).json({ success: false, message: 'Ошибка сервера' });
            }
            if (!user) {
                return res.status(401).json({ success: false, message: 'Неверный логин или пароль' });
            }
            bcrypt.compare(password, user.password, (err, match) => {
                if (err || !match) {
                    return res.status(401).json({ success: false, message: 'Неверный логин или пароль' });
                }
                const token = Buffer.from(JSON.stringify({ email: user.email, role: user.role })).toString('base64');
                res.json({ success: true, user: { email: user.email, role: user.role }, token });
            });
        });
        return;
    }
    db.get('SELECT * FROM users WHERE email = ? AND role = ?', [email, 'customer'], (err, user) => {
        if (err) {
            logError('Ошибка входа пользователя', err);
            return res.status(500).json({ success: false, message: 'Ошибка сервера' });
        }
        if (!user) {
            return res.status(401).json({ success: false, message: 'Неверный логин или пароль' });
        }
        bcrypt.compare(password, user.password, (err, match) => {
            if (err || !match) {
                return res.status(401).json({ success: false, message: 'Неверный логин или пароль' });
            }
            const token = Buffer.from(JSON.stringify({ email: user.email, role: user.role })).toString('base64');
            res.json({ success: true, user: { email: user.email, role: user.role }, token });
        });
    });
});

// 🔐 POST /api/register
app.post('/api/register', (req, res) => {
    const { name, email, password, role } = req.body;
    if (!email || !password) {
        return res.status(400).json({ success: false, message: 'Email и пароль обязательны' });
    }
    if (password.length < 6) {
        return res.status(400).json({ success: false, message: 'Пароль должен содержать минимум 6 символов' });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({ success: false, message: 'Некорректный email' });
    }
    bcrypt.hash(password, 10, (err, hash) => {
        if (err) {
            logError('Ошибка хеширования пароля', err);
            return res.status(500).json({ success: false, message: 'Ошибка сервера' });
        }
        db.run('INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
            [name || '', email, hash, role || 'customer'],
            function(err) {
                if (err) {
                    if (err.message.includes('UNIQUE constraint failed')) {
                        return res.status(400).json({ success: false, message: 'Email уже зарегистрирован' });
                    }
                    logError('Ошибка регистрации', err);
                    return res.status(500).json({ success: false, message: 'Ошибка при регистрации' });
                }
                res.json({ success: true, user: { email, role: role || 'customer' }, id: this.lastID });
            }
        );
    });
});

// 🛒 POST /api/orders
app.post('/api/orders', (req, res) => {
    const { userId, items, total } = req.body;
    if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ success: false, message: 'Корзина пуста' });
    }
    if (typeof total !== 'number' || total <= 0) {
        return res.status(400).json({ success: false, message: 'Некорректная сумма заказа' });
    }
    db.serialize(() => {
        db.run('INSERT INTO orders (user_id, total) VALUES (?, ?)', [userId, total], function(err) {
            if (err) {
                logError('Ошибка создания заказа', err);
                return res.status(500).json({ success: false, message: 'Ошибка при создании заказа' });
            }
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

// 🛒 GET /api/orders (Admin) - ТОЛЬКО ОДИН РАЗ
app.get('/api/orders', requireAdmin, (req, res) => {
    db.all(`SELECT o.*, u.email as customer FROM orders o LEFT JOIN users u ON o.user_id = u.id ORDER BY o.created_at DESC`, [], (err, rows) => {
        if (err) {
            logError('Ошибка получения заказов', err);
            return res.status(500).json({ error: 'Внутренняя ошибка сервера' });
        }
        res.json(rows);
    });
});

// 🛒 PUT /api/orders/:id/status (Admin)
app.put('/api/orders/:id/status', requireAdmin, (req, res) => {
    const { status } = req.body;
    const validStatuses = ['new', 'processing', 'delivered', 'cancelled'];
    if (!status || !validStatuses.includes(status)) {
        return res.status(400).json({ success: false, message: 'Некорректный статус' });
    }
    db.run(`UPDATE orders SET status=? WHERE id=?`, [status, req.params.id], function(err) {
        if (err) {
            logError('Ошибка обновления статуса', err);
            return res.status(500).json({ success: false, message: 'Ошибка при обновлении' });
        }
        res.json({ success: true });
    });
});

// 👤 GET /api/users/me - Получить пользователя по email
app.get('/api/users/me', (req, res) => {
    const email = req.query.email;
    if (!email) {
        return res.status(400).json({ error: 'Email обязателен' });
    }
    db.get('SELECT id, email, name, role FROM users WHERE email = ?', [email], (err, user) => {
        if (err) {
            logError('Ошибка получения пользователя', err);
            return res.status(500).json({ error: 'Внутренняя ошибка сервера' });
        }
        if (!user) {
            return res.status(404).json({ error: 'Пользователь не найден' });
        }
        res.json(user);
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
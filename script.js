/* ===== API CONFIG ===== */
const API_URL = window.location.origin + '/api';

/* ===== DATA & STATE ===== */
let products = [];
let cart = [];

/* ===== DOM ELEMENT CACHE ===== */
const elements = {
    productsGrid: null,
    cartCount: null,
    cartModal: null,
    cartBtn: null,
    closeBtn: null,
    cartItems: null,
    cartTotal: null,
    userInfo: null,
    logoutBtn: null,
    loginLink: null,
    adminLink: null,
    navLinks: null,
};

/* ===== INITIALIZATION ===== */
// Инициализация приложения после загрузки DOM
document.addEventListener('DOMContentLoaded', () => {
    cacheElements();
    loadCartFromStorage();
    checkAuth();
    setupEventListeners();
    setupHamburger();
    setupHeroAnimation();
    setupFilters();
    setupPageNavigation();
    setupScrollSpy();
    handleAnchorScroll();
    
    const currentPage = window.location.pathname.split('/').pop() || 'main.html';
    if (currentPage === 'admin.html') {
        if (checkAdminAccess()) {
            updateStats();
            loadAdminProducts();
        }
        return;
    }
    
    if (elements.productsGrid) {
        loadProducts();
        filterProducts();
    }
});

// Кэширование часто используемых DOM-элементов
function cacheElements() {
    elements.productsGrid = document.getElementById('productsGrid');
    elements.cartCount = document.getElementById('cartCount');
    elements.cartModal = document.getElementById('cartModal');
    elements.cartBtn = document.getElementById('cartBtn');
    elements.closeBtn = document.querySelector('.close');
    elements.cartItems = document.getElementById('cartItems');
    elements.cartTotal = document.getElementById('cartTotal');
    elements.userInfo = document.getElementById('userInfo');
    elements.logoutBtn = document.getElementById('logoutBtn');
    elements.loginLink = document.getElementById('loginLink');
    elements.adminLink = document.getElementById('adminLink');
    elements.navLinks = document.querySelectorAll('.nav-link');
}

/* ===== HAMBURGER MENU ===== */
// Настройка мобильного меню-гамбургера
function setupHamburger() {
    const hamburger = document.getElementById('hamburger');
    const navMenu = document.querySelector('.nav-menu');
    if (!hamburger || !navMenu) return;
    
    hamburger.addEventListener('click', () => {
        const isOpen = navMenu.classList.toggle('open');
        hamburger.classList.toggle('open', isOpen);
        hamburger.setAttribute('aria-expanded', String(isOpen));
    });
    
    navMenu.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', () => {
            navMenu.classList.remove('open');
            hamburger.classList.remove('open');
            hamburger.setAttribute('aria-expanded', 'false');
        });
    });
    
    document.addEventListener('click', (e) => {
        if (!hamburger.contains(e.target) && !navMenu.contains(e.target)) {
            navMenu.classList.remove('open');
            hamburger.classList.remove('open');
            hamburger.setAttribute('aria-expanded', 'false');
        }
    });
}

/* ===== ANCHOR SCROLL ===== */
// Плавная прокрутка к якорю при загрузке страницы
function handleAnchorScroll() {
    const hash = window.location.hash;
    if (!hash) return;
    const target = document.querySelector(hash);
    if (target) {
        setTimeout(() => {
            window.scrollTo({ top: target.offsetTop - 80, behavior: 'smooth' });
        }, 100);
    }
}

/* ===== PAGE NAVIGATION ===== */
// Управление активной навигацией в зависимости от текущей страницы
function setupPageNavigation() {
    const currentPage = window.location.pathname.split('/').pop() || 'main.html';
    const hash = window.location.hash;
    elements.navLinks.forEach(link => link.classList.remove('active'));
    
    if (currentPage === 'main.html' || currentPage === 'index.html' || currentPage === '') {
        if (hash === '#about') setActiveLink('about');
        else if (hash === '#contacts') setActiveLink('contacts');
        return;
    }
    
    if (currentPage === 'catalog.html') {
        elements.navLinks.forEach(link => {
            if (link.getAttribute('data-page') === 'catalog') link.classList.add('active');
        });
    }
}

// Установка активной ссылки навигации
function setActiveLink(sectionId) {
    elements.navLinks.forEach(link => {
        link.classList.remove('active');
        const dataSection = link.getAttribute('data-section');
        const dataPage = link.getAttribute('data-page');
        const href = link.getAttribute('href') || '';
        
        if (dataSection === sectionId || href === '#' + sectionId || href.includes('#' + sectionId)) {
            link.classList.add('active');
        }
        if (dataPage === 'home' && sectionId === 'home') {
            link.classList.add('active');
        }
    });
}

/* ===== SCROLL SPY ===== */
// Подсветка активной секции при прокрутке страницы
function setupScrollSpy() {
    const currentPage = window.location.pathname.split('/').pop() || 'main.html';
    if (currentPage !== 'main.html' && currentPage !== 'index.html' && currentPage !== '') return;
    const sections = document.querySelectorAll('main, section, footer');
    
    function updateActiveLink() {
        const scrollPos = window.scrollY + 100;
        const windowHeight = window.innerHeight;
        const docHeight = document.documentElement.scrollHeight;
        let current = 'home';
        
        sections.forEach(section => {
            const id = section.getAttribute('id');
            if (!id) return;
            const top = section.offsetTop;
            
            if (id === 'about' && scrollPos >= top - 100) current = 'about';
            else if (id === 'contacts' && scrollPos >= top) current = 'contacts';
            else if (scrollPos >= top && scrollPos < top + section.offsetHeight) current = id;
        });
        
        if (scrollPos + windowHeight >= docHeight - 20) current = 'contacts';
        
        elements.navLinks.forEach(link => {
            link.classList.remove('active');
            const href = link.getAttribute('href') || '';
            const dataSection = link.getAttribute('data-section');
            const dataPage = link.getAttribute('data-page');
            
            if (dataPage === 'home' && current === 'home') link.classList.add('active');
            else if (dataSection === current) link.classList.add('active');
            else if (href.includes('#' + current)) link.classList.add('active');
        });
    }
    
    window.addEventListener('scroll', updateActiveLink);
    setTimeout(updateActiveLink, 200);
    
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            const href = this.getAttribute('href');
            if (!href || href === '#' || href.includes('index.html#')) return;
            const target = document.querySelector(href);
            if (target) {
                e.preventDefault();
                window.scrollTo({ top: target.offsetTop - 80, behavior: 'smooth' });
            }
        });
    });
}

/* ===== PRODUCT DISPLAY ===== */
// Загрузка товаров из API
async function loadProducts() {
    try {
        const response = await fetch(`${API_URL}/products`);
        products = await response.json();
        if (elements.productsGrid) filterProducts();
        if (document.getElementById('productsTableBody')) renderAdminProducts();
    } catch (error) {
        console.error('Ошибка загрузки товаров:', error);
        showNotification('Не удалось загрузить товары', 'error');
    }
}

// Отрисовка карточек товаров
function displayProducts(productsToDisplay) {
    if (!elements.productsGrid) return;
    elements.productsGrid.innerHTML = productsToDisplay.map(product => `
        <div class="product-card">
            <div class="product-img">${product.emoji}</div>
            <h3>${product.name}</h3>
            <p class="product-weight">${product.weight || ''}</p>
            <div class="price">${product.price} ₽</div>
            <button class="add-btn" onclick="addToCart(${product.id})">В корзину</button>
        </div>
    `).join('');
}

/* ===== FILTERS ===== */
// Настройка фильтров и поиска
function setupFilters() {
    const searchInput = document.getElementById('searchInput');
    const categoryFilter = document.getElementById('categoryFilter');
    const priceFrom = document.getElementById('priceFrom');
    const priceTo = document.getElementById('priceTo');
    const resetBtn = document.getElementById('resetFilters');
    
    if (searchInput) searchInput.addEventListener('input', debounce(filterProducts, 300));
    if (categoryFilter) categoryFilter.addEventListener('change', filterProducts);
    if (priceFrom) priceFrom.addEventListener('input', debounce(filterProducts, 300));
    if (priceTo) priceTo.addEventListener('input', debounce(filterProducts, 300));
    if (resetBtn) resetBtn.addEventListener('click', resetFilters);
}

// Фильтрация товаров по поиску, категории и цене
function filterProducts() {
    const searchTerm = document.getElementById('searchInput')?.value.toLowerCase() || '';
    const activeCategory = document.getElementById('categoryFilter')?.value || 'all';
    const minPrice = parseFloat(document.getElementById('priceFrom')?.value) || 0;
    const maxPrice = parseFloat(document.getElementById('priceTo')?.value) || Infinity;
    
    const filtered = products.filter(product => {
        const matchesSearch = product.name.toLowerCase().includes(searchTerm);
        const matchesCategory = activeCategory === 'all' || product.category === activeCategory;
        const matchesPrice = product.price >= minPrice && product.price <= maxPrice;
        return matchesSearch && matchesCategory && matchesPrice;
    });
    
    displayProducts(filtered);
    updateResultsCount(filtered.length);
    toggleEmptyState(filtered.length === 0);
}

// Обновление счётчика найденных товаров
function updateResultsCount(count) {
    const el = document.getElementById('resultsCount');
    if (el) el.textContent = count;
}

// Показать или скрыть состояние пустого результата
function toggleEmptyState(isEmpty) {
    const emptyState = document.getElementById('emptyState');
    const productsGrid = document.getElementById('productsGrid');
    if (!emptyState || !productsGrid) return;
    emptyState.style.display = isEmpty ? 'block' : 'none';
    productsGrid.style.display = isEmpty ? 'none' : 'grid';
}

// Сброс всех фильтров
window.resetFilters = () => {
    const searchInput = document.getElementById('searchInput');
    const categoryFilter = document.getElementById('categoryFilter');
    const priceFrom = document.getElementById('priceFrom');
    const priceTo = document.getElementById('priceTo');
    
    if (searchInput) searchInput.value = '';
    if (categoryFilter) categoryFilter.value = 'all';
    if (priceFrom) priceFrom.value = '';
    if (priceTo) priceTo.value = '';
    
    filterProducts();
    showNotification('Фильтры сброшены');
};

// Debounce для ограничения частоты вызовов
function debounce(func, wait) {
    let timeout;
    return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func(...args), wait);
    };
}

/* ===== CART ===== */
// Добавление товара в корзину
window.addToCart = (id) => {
    const product = products.find(p => p.id === id);
    if (!product) return;
    const existing = cart.find(item => item.id === id);
    if (existing) {
        existing.quantity += 1;
    } else {
        cart.push({ ...product, quantity: 1 });
    }
    updateCartUI();
    saveCartToStorage();
    showNotification(`${product.name} добавлен в корзину`);
};

// Удаление товара из корзины
window.removeFromCart = (id) => {
    cart = cart.filter(item => item.id !== id);
    updateCartUI();
    saveCartToStorage();
};

// Изменение количества товара в корзине
window.updateQuantity = (id, change) => {
    const item = cart.find(item => item.id === id);
    if (!item) return;
    item.quantity += change;
    if (item.quantity <= 0) {
        removeFromCart(id);
    } else {
        updateCartUI();
        saveCartToStorage();
    }
};

// Обновление отображения корзины
function updateCartUI() {
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    if (elements.cartCount) elements.cartCount.textContent = totalItems;
    renderCartItems();
}

// Отрисовка элементов корзины
function renderCartItems() {
    if (!elements.cartItems) return;
    if (cart.length === 0) {
        elements.cartItems.innerHTML = '<p style="text-align:center;padding:40px;color:var(--text-muted)">Корзина пуста</p>';
        if (elements.cartTotal) elements.cartTotal.textContent = '0 ₽';
        return;
    }
    
    elements.cartItems.innerHTML = cart.map(item => `
        <div class="cart-item">
            <div class="cart-item-info">
                <div class="cart-item-emoji">${item.emoji}</div>
                <div class="cart-item-details">
                    <h4>${item.name}</h4>
                    <p>${item.price} ₽/шт</p>
                </div>
            </div>
            <div class="cart-item-controls">
                <div class="quantity-control">
                    <button class="quantity-btn" onclick="updateQuantity(${item.id}, -1)">−</button>
                    <span class="quantity-value">${item.quantity}</span>
                    <button class="quantity-btn" onclick="updateQuantity(${item.id}, 1)">+</button>
                </div>
                <div style="font-weight:700;min-width:80px;text-align:right">${item.price * item.quantity} ₽</div>
                <button class="remove-btn" onclick="removeFromCart(${item.id})" title="Удалить">×</button>
            </div>
        </div>
    `).join('');
    
    const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    if (elements.cartTotal) elements.cartTotal.textContent = `${total} ₽`;
}

/* ===== CHECKOUT ===== */
// Оформление заказа через API
window.checkout = async () => {
    if (cart.length === 0) {
        showNotification('Корзина пуста!', 'error');
        return;
    }
    const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const userEmail = localStorage.getItem('userEmail') || 'guest@example.com';
    const isLoggedIn = localStorage.getItem('isLoggedIn');
    
    let userId = null;
    if (isLoggedIn === 'true') {
        try {
            const userResponse = await fetch(`${API_URL}/users/me?email=${encodeURIComponent(userEmail)}`);
            if (userResponse.ok) {
                const userData = await userResponse.json();
                userId = userData.id;
            }
        } catch (error) {
            console.warn('Не удалось получить ID пользователя');
        }
    }
    
    try {
        const response = await fetch(`${API_URL}/orders`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: userId, items: cart, total: total })
        });
        const result = await response.json();
        if (result.success) {
            alert(`Заказ оформлен!\n\nСумма заказа: ${total} ₽\nID заказа: ${result.orderId}\n\nСпасибо за покупку!`);
            cart = [];
            updateCartUI();
            saveCartToStorage();
            closeModal();
        } else {
            showNotification('Ошибка оформления заказа', 'error');
        }
    } catch (error) {
        showNotification('Ошибка сети', 'error');
    }
};

/* ===== MODAL ===== */
// Открытие модального окна корзины
function openModal() {
    if (!elements.cartModal) return;
    elements.cartModal.style.display = 'block';
    document.body.style.overflow = 'hidden';
}

// Закрытие модального окна корзины
function closeModal() {
    if (!elements.cartModal) return;
    elements.cartModal.style.display = 'none';
    document.body.style.overflow = '';
}

/* ===== AUTH ===== */
// Обработка формы входа
async function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const role = document.querySelector('.role-btn.active')?.dataset.role || 'customer';
    const errorDiv = document.getElementById('errorMessage');
    
    if (!email || !password) {
        if (errorDiv) { errorDiv.textContent = '⚠️ Введите email и пароль'; errorDiv.classList.add('show'); }
        return;
    }
    if (errorDiv) errorDiv.classList.remove('show');
    
    try {
        const response = await fetch(`${API_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password, role })
        });
        const result = await response.json();
        
        if (result.success) {
            localStorage.setItem('isLoggedIn', 'true');
            localStorage.setItem('userRole', result.user.role);
            localStorage.setItem('userEmail', result.user.email);
            localStorage.setItem('authToken', result.token || '');
            window.location.href = result.user.role === 'admin' ? 'admin.html' : 'main.html';
        } else {
            const msg = result.message || 'Неверный логин или пароль';
            if (errorDiv) { errorDiv.textContent = '⚠️ ' + msg; errorDiv.classList.add('show'); }
            else showNotification(msg, 'error');
        }
    } catch (error) {
        const msg = 'Ошибка сети. Проверьте, запущен ли сервер';
        if (errorDiv) { errorDiv.textContent = '⚠️ ' + msg; errorDiv.classList.add('show'); }
        else showNotification(msg, 'error');
    }
}

// Получение заголовков авторизации для API-запросов
function getAuthHeaders() {
    const token = localStorage.getItem('authToken');
    return {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : ''
    };
}

// Переключение видимости пароля
window.togglePassword = () => {
    const input = document.getElementById('password');
    const toggle = document.querySelector('.toggle-password');
    const isText = input.type === 'text';
    input.type = isText ? 'password' : 'text';
    if (toggle) toggle.textContent = isText ? 'Показать' : 'Скрыть';
};

// Переключение видимости пароля для регистрации
window.toggleRegPassword = (inputId, btn) => {
    const input = document.getElementById(inputId);
    if (!input) return;
    const isText = input.type === 'text';
    input.type = isText ? 'password' : 'text';
    btn.textContent = isText ? 'Показать' : 'Скрыть';
};

/* ===== REGISTER FORM ===== */
// Обработка формы регистрации
(function setupRegisterForm() {
    const form = document.getElementById('registerForm');
    if (!form) return;
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        const name = document.getElementById('regName').value.trim();
        const email = document.getElementById('regEmail').value.trim();
        const password = document.getElementById('regPassword').value;
        const confirm = document.getElementById('regPasswordConfirm').value;
        const errorDiv = document.getElementById('errorMessage');
        const successDiv = document.getElementById('successMessage');
        
        errorDiv.classList.remove('show');
        successDiv.classList.remove('show');
        
        if (!name || !email || !password || !confirm) {
            errorDiv.textContent = '⚠️ Заполните все поля';
            errorDiv.classList.add('show');
            return;
        }
        if (password.length < 6) {
            errorDiv.textContent = '⚠️ Пароль должен содержать не менее 6 символов';
            errorDiv.classList.add('show');
            return;
        }
        if (password !== confirm) {
            errorDiv.textContent = '⚠️ Пароли не совпадают';
            errorDiv.classList.add('show');
            return;
        }
        
        try {
            const response = await fetch(`${API_URL}/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, email, password, role: 'customer' })
            });
            const result = await response.json();
            
            if (result.success) {
                localStorage.setItem('isLoggedIn', 'true');
                localStorage.setItem('userRole', 'customer');
                localStorage.setItem('userEmail', email);
                successDiv.textContent = '✅ Регистрация прошла успешно! Перенаправляем...';
                successDiv.classList.add('show');
                setTimeout(() => { window.location.href = 'main.html'; }, 1500);
            } else {
                errorDiv.textContent = '⚠️ ' + (result.message || 'Ошибка регистрации');
                errorDiv.classList.add('show');
            }
        } catch (error) {
            errorDiv.textContent = '⚠️ Ошибка сети. Проверьте, запущен ли сервер';
            errorDiv.classList.add('show');
        }
    });
})();

// Проверка статуса авторизации пользователя
function checkAuth() {
    const isLoggedIn = localStorage.getItem('isLoggedIn');
    const email = localStorage.getItem('userEmail');
    const userRole = localStorage.getItem('userRole');
    
    if (elements.userInfo && elements.logoutBtn && elements.loginLink) {
        if (isLoggedIn === 'true') {
            elements.userInfo.textContent = email || '';
            elements.userInfo.style.display = 'inline';
            elements.logoutBtn.style.display = 'inline-block';
            elements.loginLink.style.display = 'none';
        } else {
            elements.userInfo.style.display = 'none';
            elements.logoutBtn.style.display = 'none';
            elements.loginLink.style.display = 'inline-block';
        }
    }
    
    if (elements.adminLink) {
        elements.adminLink.style.display = (isLoggedIn === 'true' && userRole === 'admin') ? 'inline-block' : 'none';
    }
}

// Выход из системы
window.logout = () => {
    localStorage.removeItem('userRole');
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('authToken');
    showNotification('Выход выполнен');
    setTimeout(() => { window.location.href = 'main.html'; }, 1000);
};

// Переход в админ-панель с проверкой прав
window.goToAdmin = () => {
    const isLoggedIn = localStorage.getItem('isLoggedIn');
    const userRole = localStorage.getItem('userRole');
    if (isLoggedIn !== 'true') {
        showNotification('Сначала войдите в систему!', 'error');
        setTimeout(() => { window.location.href = 'login.html'; }, 1500);
        return;
    }
    if (userRole !== 'admin') {
        showNotification('Доступ только для администраторов!', 'error');
        return;
    }
    window.location.href = 'admin.html';
};

// Показать дополнительную информацию
window.showMore = () => {
    alert('FreshMarket — это сервис быстрой доставки свежих продуктов.\n\nДоставка за 15 минут\nТолько свежие продукты\nУдобное приложение\nВыгодные цены');
};

/* ===== EVENT LISTENERS ===== */
// Настройка обработчиков событий
function setupEventListeners() {
    if (elements.cartBtn) elements.cartBtn.addEventListener('click', openModal);
    if (elements.closeBtn) elements.closeBtn.addEventListener('click', closeModal);
    window.addEventListener('click', (e) => {
        if (e.target === elements.cartModal) closeModal();
    });
    
    const loginForm = document.getElementById('loginForm');
    if (loginForm) loginForm.addEventListener('submit', handleLogin);
    
    const contactForm = document.querySelector('.contact-form');
    if (contactForm) {
        contactForm.addEventListener('submit', (e) => {
            e.preventDefault();
            showNotification('Сообщение отправлено!');
            contactForm.reset();
        });
    }
    
    document.querySelectorAll('.role-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.role-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        });
    });
}

/* ===== HERO ANIMATION ===== */
// Анимация плавающих элементов на главной странице
function setupHeroAnimation() {
    const heroVisual = document.querySelector('.hero-visual');
    const items = document.querySelectorAll('.item');
    if (!heroVisual || window.innerWidth <= 992) return;
    let trackingEnabled = false;
    setTimeout(() => { trackingEnabled = true; }, 2000);
    
    heroVisual.addEventListener('mousemove', (e) => {
        if (!trackingEnabled) return;
        const rect = heroVisual.getBoundingClientRect();
        const xPct = (e.clientX - rect.left) / rect.width - 0.5;
        const yPct = (e.clientY - rect.top) / rect.height - 0.5;
        
        items.forEach((item, i) => {
            const intensity = (i + 1) * 15;
            item.style.transform = `translate(${xPct * intensity}px, ${yPct * intensity}px)` +
                ` rotateX(${yPct * -intensity * 1.5}deg)` +
                ` rotateY(${xPct * intensity * 1.5}deg)`;
        });
    });
    
    heroVisual.addEventListener('mouseleave', () => {
        items.forEach(item => { item.style.transform = ''; });
    });
}

/* ===== ADMIN PANEL ===== */
// Проверка доступа к админ-панели
function checkAdminAccess() {
    const isLoggedIn = localStorage.getItem('isLoggedIn');
    const userRole = localStorage.getItem('userRole');
    if (isLoggedIn !== 'true' || userRole !== 'admin') {
        showNotification('Доступ запрещён! Только для администраторов', 'error');
        setTimeout(() => { window.location.href = 'main.html'; }, 1500);
        return false;
    }
    return true;
}

// Переключение между секциями админ-панели
function showAdminSection(section) {
    const productsSection = document.getElementById('productsSection');
    const ordersSection = document.getElementById('ordersSection');
    if (!productsSection || !ordersSection) {
        console.error('Секции не найдены!');
        return;
    }
    productsSection.style.display = section === 'products' ? 'block' : 'none';
    ordersSection.style.display = section === 'orders' ? 'block' : 'none';
    
    document.querySelectorAll('.admin-nav-item').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.section === section) btn.classList.add('active');
    });
    document.querySelectorAll('.admin-tab-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.section === section) btn.classList.add('active');
    });
    
    if (section === 'products') loadAdminProducts();
    else if (section === 'orders') loadAdminOrders();
}

// Загрузка товаров для админ-панели
async function loadAdminProducts() {
    try {
        const response = await fetch(`${API_URL}/products`);
        if (!response.ok) throw new Error('Server error');
        const products = await response.json();
        renderAdminProducts(products);
    } catch (error) {
        console.error('Ошибка загрузки товаров:', error);
        const tbody = document.getElementById('productsTableBody');
        if (tbody) {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;padding:40px;color:var(--text-muted)">Не удалось загрузить товары</td></tr>';
        }
    }
}

// Отрисовка таблицы товаров
function renderAdminProducts(products) {
    const tbody = document.getElementById('productsTableBody');
    if (!tbody) return;
    if (products.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;padding:40px;color:var(--text-muted)">Товары отсутствуют</td></tr>';
        updateStats();
        return;
    }
    tbody.innerHTML = products.map(p => `
        <tr>
            <td><div class="product-cell"><div class="product-emoji">${p.emoji || '📦'}</div><span class="product-name">${p.name}</span></div></td>
            <td>${p.price} ₽</td>
            <td><span class="stock-status stock-in">В наличии</span></td>
            <td><div class="action-buttons"><button class="action-btn edit" onclick="editProduct(${p.id})">Редактировать</button><button class="action-btn delete" onclick="deleteProduct(${p.id})">Удалить</button></div></td>
        </tr>
    `).join('');
    updateStats();
}

// Загрузка заказов для админ-панели
async function loadAdminOrders() {
    try {
        const response = await fetch(`${API_URL}/orders`, { headers: getAuthHeaders() });
        if (!response.ok) throw new Error('Server error: ' + response.status);
        const orders = await response.json();
        renderAdminOrders(orders);
    } catch (error) {
        console.error('Ошибка загрузки заказов:', error);
        const tbody = document.getElementById('ordersTableBody');
        if (tbody) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:40px;color:var(--text-muted)">Не удалось загрузить заказы</td></tr>';
        }
    }
}

// Отрисовка таблицы заказов
function renderAdminOrders(orders) {
    const tbody = document.getElementById('ordersTableBody');
    if (!tbody) return;
    if (orders.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:40px;color:var(--text-muted)">Заказы отсутствуют</td></tr>';
        updateStats();
        return;
    }
    tbody.innerHTML = orders.map(o => `
        <tr>
            <td>#${o.id}</td>
            <td>${o.customer || 'Гость'}</td>
            <td>${o.total} ₽</td>
            <td><select class="order-status" onchange="updateOrderStatus(${o.id}, this.value)"><option value="new" ${o.status === 'new' ? 'selected' : ''}>Новый</option><option value="processing" ${o.status === 'processing' ? 'selected' : ''}>В обработке</option><option value="delivered" ${o.status === 'delivered' ? 'selected' : ''}>Доставлен</option><option value="cancelled" ${o.status === 'cancelled' ? 'selected' : ''}>Отменён</option></select></td>
            <td>${new Date(o.created_at).toLocaleDateString('ru-RU')}</td>
            <td><button class="action-btn edit" onclick="viewOrder(${o.id})">Просмотр</button></td>
        </tr>
    `).join('');
    updateStats();
}

// Обновление статистики админ-панели
function updateStats() {
    const totalProducts = document.getElementById('totalProducts');
    const todayOrders = document.getElementById('todayOrders');
    const revenue = document.getElementById('revenue');
    
    if (totalProducts) {
        fetch(`${API_URL}/products`).then(res => res.json()).then(products => {
            totalProducts.textContent = products.length;
        });
    }
    
    if (todayOrders || revenue) {
        fetch(`${API_URL}/orders`, { headers: getAuthHeaders() }).then(res => res.json()).then(orders => {
            const today = new Date().toDateString();
            const todayOrdersCount = orders.filter(o => new Date(o.created_at).toDateString() === today).length;
            const totalRevenue = orders.reduce((sum, o) => sum + o.total, 0);
            if (todayOrders) todayOrders.textContent = todayOrdersCount;
            if (revenue) revenue.textContent = `${totalRevenue} ₽`;
        });
    }
}

// Добавление нового товара
window.openAddProductModal = async () => {
    const name = prompt('Название товара:');
    if (!name) return;
    const price = parseFloat(prompt('Цена:'));
    if (isNaN(price)) { showNotification('Некорректная цена', 'error'); return; }
    const emoji = prompt('Эмодзи (например 🍎):', '📦');
    const category = prompt('Категория (fruits, dairy, bakery, drinks, other):', 'other');
    const weight = prompt('Вес:', '1 шт');
    const stock = parseInt(prompt('Количество на складе:', '10'));
    
    try {
        const response = await fetch(`${API_URL}/products`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({ name, price, emoji, category, weight, stock })
        });
        const result = await response.json();
        if (result.success) {
            showNotification('Товар добавлен');
            loadAdminProducts();
        } else {
            showNotification('Ошибка при добавлении', 'error');
        }
    } catch (error) {
        showNotification('Ошибка сети', 'error');
    }
};

// Редактирование товара
window.editProduct = async (id) => {
    try {
        const response = await fetch(`${API_URL}/products`);
        const products = await response.json();
        const product = products.find(p => p.id === id);
        if (!product) { showNotification('Товар не найден', 'error'); return; }
        
        const newName = prompt('Новое название:', product.name);
        if (!newName) return;
        const newPrice = parseFloat(prompt('Новая цена:', product.price));
        if (isNaN(newPrice)) { showNotification('Некорректная цена', 'error'); return; }
        const newStock = parseInt(prompt('Новое количество на складе:', product.stock || '0'));
        
        const responseUpdate = await fetch(`${API_URL}/products/${id}`, {
            method: 'PUT',
            headers: getAuthHeaders(),
            body: JSON.stringify({ name: newName, price: newPrice, emoji: product.emoji, category: product.category, weight: product.weight, stock: newStock })
        });
        const result = await responseUpdate.json();
        if (result.success) {
            showNotification('Товар обновлён');
            loadAdminProducts();
        } else {
            showNotification('Ошибка при обновлении', 'error');
        }
    } catch (error) {
        showNotification('Ошибка сети', 'error');
    }
};

// Удаление товара
window.deleteProduct = async (id) => {
    if (!confirm('Удалить товар? Это действие нельзя отменить.')) return;
    try {
        const response = await fetch(`${API_URL}/products/${id}`, { method: 'DELETE', headers: getAuthHeaders() });
        const result = await response.json();
        if (result.success) {
            showNotification('Товар удалён');
            loadAdminProducts();
        } else {
            showNotification('Ошибка при удалении', 'error');
        }
    } catch (error) {
        showNotification('Ошибка сети', 'error');
    }
};

// Обновление статуса заказа
window.updateOrderStatus = async (orderId, status) => {
    try {
        const response = await fetch(`${API_URL}/orders/${orderId}/status`, {
            method: 'PUT',
            headers: getAuthHeaders(),
            body: JSON.stringify({ status })
        });
        const result = await response.json();
        if (result.success) {
            showNotification('Статус заказа обновлён');
        } else {
            showNotification('Ошибка при обновлении статуса', 'error');
        }
    } catch (error) {
        showNotification('Ошибка сети', 'error');
    }
};

// Просмотр деталей заказа
window.viewOrder = async (orderId) => {
    try {
        const response = await fetch(`${API_URL}/orders`, { headers: getAuthHeaders() });
        const orders = await response.json();
        const order = orders.find(o => o.id === orderId);
        if (!order) { showNotification('Заказ не найден', 'error'); return; }
        alert(`Заказ #${order.id}\n\nКлиент: ${order.customer || 'Гость'}\nСумма: ${order.total} ₽\nСтатус: ${order.status}\nДата: ${new Date(order.created_at).toLocaleString('ru-RU')}`);
    } catch (error) {
        showNotification('Ошибка загрузки заказа', 'error');
    }
};

// Экспорт функций админ-панели в глобальную область видимости
window.showAdminSection = showAdminSection;
window.checkAdminAccess = checkAdminAccess;
window.loadAdminProducts = loadAdminProducts;
window.loadAdminOrders = loadAdminOrders;
window.renderAdminProducts = renderAdminProducts;
window.renderAdminOrders = renderAdminOrders;
window.updateStats = updateStats;
window.editProduct = editProduct;
window.deleteProduct = deleteProduct;
window.openAddProductModal = openAddProductModal;
window.updateOrderStatus = updateOrderStatus;
window.viewOrder = viewOrder;
window.logout = logout;

/* ===== LOCAL STORAGE ===== */
// Сохранение корзины в localStorage
function saveCartToStorage() {
    localStorage.setItem('freshmarket_cart', JSON.stringify(cart));
}

// Загрузка корзины из localStorage
function loadCartFromStorage() {
    const saved = localStorage.getItem('freshmarket_cart');
    if (saved) {
        cart = JSON.parse(saved);
        updateCartUI();
    }
}

/* ===== NOTIFICATIONS ===== */
// Показ уведомления пользователю
function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = 'toast-notification' + (type === 'error' ? ' toast-error' : '');
    notification.textContent = (type === 'error' ? '❌ ' : '✅ ') + message;
    document.body.appendChild(notification);
    notification.getBoundingClientRect();
    notification.classList.add('toast-visible');
    setTimeout(() => {
        notification.classList.remove('toast-visible');
        notification.addEventListener('transitionend', () => notification.remove());
    }, 3500);
}

/* ===== ANIMATION STYLES ===== */
// Инъекция стилей для уведомлений
const animStyle = document.createElement('style');
animStyle.textContent = `.toast-notification { position: fixed; top: 100px; right: 20px; background: var(--primary); color: #fff; padding: 14px 22px; border-radius: 12px; box-shadow: 0 10px 30px rgba(0,0,0,.18); z-index: 10000; font-weight: 600; font-size: 15px; transform: translateX(440px); transition: transform .35s cubic-bezier(.175,.885,.32,1.275), opacity .35s ease; opacity: 0; max-width: calc(100vw - 40px); } .toast-notification.toast-error { background: #e53e3e; } .toast-visible { transform: translateX(0); opacity: 1; }`;
document.head.appendChild(animStyle);
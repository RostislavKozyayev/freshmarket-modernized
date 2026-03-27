/* ===== DATA & STATE ===== */
let products = [];

async function loadProducts() {
    try {
        const response = await fetch('http://localhost:3000/api/products');
        products = await response.json();
        if (elements.productsGrid) filterProducts();
    } catch (error) {
        console.error('Ошибка загрузки товаров:', error);
        // Fallback: используем заглушки если сервер недоступен
        products = [/* ваши старые данные */];
        if (elements.productsGrid) filterProducts();
    }
}

let cart = [];

/* ===== DOM ELEMENT CACHE ===== */
const elements = {
    productsGrid: null,
    cartCount:    null,
    cartModal:    null,
    cartBtn:      null,
    closeBtn:     null,
    cartItems:    null,
    cartTotal:    null,
    userInfo:     null,
    logoutBtn:    null,
    loginLink:    null,
    adminLink:    null,
    navLinks:     null,
};

/* ===== INITIALIZATION ===== */
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
    loadProducts();

    // Если открыт каталог — отрисовываем товары через filterProducts,
    // чтобы сразу обновился счётчик и пустое состояние.
    if (elements.productsGrid) {
        filterProducts();
    }
});

function cacheElements() {
    elements.productsGrid = document.getElementById('productsGrid');
    elements.cartCount    = document.getElementById('cartCount');
    elements.cartModal    = document.getElementById('cartModal');
    elements.cartBtn      = document.getElementById('cartBtn');
    elements.closeBtn     = document.querySelector('.close');
    elements.cartItems    = document.getElementById('cartItems');
    elements.cartTotal    = document.getElementById('cartTotal');
    elements.userInfo     = document.getElementById('userInfo');
    elements.logoutBtn    = document.getElementById('logoutBtn');
    elements.loginLink    = document.getElementById('loginLink');
    elements.adminLink    = document.getElementById('adminLink');
    elements.navLinks     = document.querySelectorAll('.nav-link');
}

/* ===== HAMBURGER MENU ===== */
function setupHamburger() {
    const hamburger = document.getElementById('hamburger');
    const navMenu   = document.querySelector('.nav-menu');
    if (!hamburger || !navMenu) return;

    hamburger.addEventListener('click', () => {
        const isOpen = navMenu.classList.toggle('open');
        hamburger.classList.toggle('open', isOpen);
        hamburger.setAttribute('aria-expanded', String(isOpen));
    });

    // Закрываем меню при клике по ссылке
    navMenu.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', () => {
            navMenu.classList.remove('open');
            hamburger.classList.remove('open');
            hamburger.setAttribute('aria-expanded', 'false');
        });
    });

    // Закрываем меню при клике вне его
    document.addEventListener('click', (e) => {
        if (!hamburger.contains(e.target) && !navMenu.contains(e.target)) {
            navMenu.classList.remove('open');
            hamburger.classList.remove('open');
            hamburger.setAttribute('aria-expanded', 'false');
        }
    });
}

/* ===== ANCHOR SCROLL ON LOAD ===== */
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
function setupPageNavigation() {
    const currentPage = window.location.pathname.split('/').pop() || 'main.html';
    const hash = window.location.hash;

    elements.navLinks.forEach(link => link.classList.remove('active'));

    if (currentPage === 'main.html' || currentPage === 'index.html' || currentPage === '') {
        if (hash === '#about')    setActiveLink('about');
        else if (hash === '#contacts') setActiveLink('contacts');
        return;
    }

    if (currentPage === 'catalog.html') {
        elements.navLinks.forEach(link => {
            if (link.getAttribute('data-page') === 'catalog') link.classList.add('active');
        });
    }
}

function setActiveLink(sectionId) {
    elements.navLinks.forEach(link => {
        link.classList.remove('active');
        const dataSection = link.getAttribute('data-section');
        const dataPage    = link.getAttribute('data-page');
        const href        = link.getAttribute('href') || '';

        if (
            dataSection === sectionId ||
            href === '#' + sectionId ||
            href.includes('#' + sectionId)
        ) {
            link.classList.add('active');
        }
        if (dataPage === 'home' && sectionId === 'home') {
            link.classList.add('active');
        }
    });
}

/* ===== SCROLL SPY ===== */
function setupScrollSpy() {
    const currentPage = window.location.pathname.split('/').pop() || 'main.html';
    if (currentPage !== 'main.html' && currentPage !== 'index.html' && currentPage !== '') return;

    const sections = document.querySelectorAll('main, section, footer');

    function updateActiveLink() {
        const scrollPos     = window.scrollY + 100;
        const windowHeight  = window.innerHeight;
        const docHeight     = document.documentElement.scrollHeight;
        let current = 'home';

        sections.forEach(section => {
            const id  = section.getAttribute('id');
            if (!id) return;
            const top = section.offsetTop;

            if (id === 'about'    && scrollPos >= top - 100) current = 'about';
            else if (id === 'contacts' && scrollPos >= top)  current = 'contacts';
            else if (scrollPos >= top && scrollPos < top + section.offsetHeight) current = id;
        });

        if (scrollPos + windowHeight >= docHeight - 20) current = 'contacts';

        elements.navLinks.forEach(link => {
            link.classList.remove('active');
            const href        = link.getAttribute('href') || '';
            const dataSection = link.getAttribute('data-section');
            const dataPage    = link.getAttribute('data-page');

            if (dataPage === 'home' && current === 'home')       link.classList.add('active');
            else if (dataSection === current)                      link.classList.add('active');
            else if (href.includes('#' + current))                 link.classList.add('active');
        });
    }

    window.addEventListener('scroll', updateActiveLink);
    setTimeout(updateActiveLink, 200);

    // Плавный скролл для якорных ссылок
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
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
function setupFilters() {
    const searchInput    = document.getElementById('searchInput');
    const categoryFilter = document.getElementById('categoryFilter');
    const priceFrom      = document.getElementById('priceFrom');
    const priceTo        = document.getElementById('priceTo');
    const resetBtn       = document.getElementById('resetFilters');

    if (searchInput)    searchInput.addEventListener('input',    debounce(filterProducts, 300));
    if (categoryFilter) categoryFilter.addEventListener('change', filterProducts);
    if (priceFrom)      priceFrom.addEventListener('input',      debounce(filterProducts, 300));
    if (priceTo)        priceTo.addEventListener('input',        debounce(filterProducts, 300));
    if (resetBtn)       resetBtn.addEventListener('click',       resetFilters);
}

function filterProducts() {
    const searchTerm     = document.getElementById('searchInput')?.value.toLowerCase()    || '';
    const activeCategory = document.getElementById('categoryFilter')?.value               || 'all';
    const minPrice       = parseFloat(document.getElementById('priceFrom')?.value)        || 0;
    const maxPrice       = parseFloat(document.getElementById('priceTo')?.value)          || Infinity;

    const filtered = products.filter(product => {
        const matchesSearch   = product.name.toLowerCase().includes(searchTerm);
        const matchesCategory = activeCategory === 'all' || product.category === activeCategory;
        const matchesPrice    = product.price >= minPrice && product.price <= maxPrice;
        return matchesSearch && matchesCategory && matchesPrice;
    });

    displayProducts(filtered);
    updateResultsCount(filtered.length);
    toggleEmptyState(filtered.length === 0);
}

function updateResultsCount(count) {
    const el = document.getElementById('resultsCount');
    if (el) el.textContent = count;
}

function toggleEmptyState(isEmpty) {
    const emptyState   = document.getElementById('emptyState');
    const productsGrid = document.getElementById('productsGrid');
    if (!emptyState || !productsGrid) return;

    emptyState.style.display   = isEmpty ? 'block' : 'none';
    productsGrid.style.display = isEmpty ? 'none'  : 'grid';
}

window.resetFilters = () => {
    const searchInput    = document.getElementById('searchInput');
    const categoryFilter = document.getElementById('categoryFilter');
    const priceFrom      = document.getElementById('priceFrom');
    const priceTo        = document.getElementById('priceTo');

    if (searchInput)    searchInput.value    = '';
    if (categoryFilter) categoryFilter.value = 'all';
    if (priceFrom)      priceFrom.value      = '';
    if (priceTo)        priceTo.value        = '';

    filterProducts();
    showNotification('Фильтры сброшены');
};

function debounce(func, wait) {
    let timeout;
    return function (...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func(...args), wait);
    };
}

/* ===== CART ===== */
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

window.removeFromCart = (id) => {
    cart = cart.filter(item => item.id !== id);
    updateCartUI();
    saveCartToStorage();
};

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

function updateCartUI() {
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    if (elements.cartCount) elements.cartCount.textContent = totalItems;
    renderCartItems();
}

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

window.checkout = () => {
    if (cart.length === 0) {
        showNotification('Корзина пуста!', 'error');
        return;
    }
    const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    alert(`Заказ оформлен!\n\nСумма заказа: ${total} ₽\n\nСпасибо за покупку!`);
    cart = [];
    updateCartUI();
    saveCartToStorage();
    closeModal();
};

/* ===== MODAL ===== */
function openModal() {
    if (!elements.cartModal) return;
    elements.cartModal.style.display = 'block';
    document.body.style.overflow     = 'hidden';
}

function closeModal() {
    if (!elements.cartModal) return;
    elements.cartModal.style.display = 'none';
    document.body.style.overflow     = '';
}

/* ===== AUTH ===== */
function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const role  = document.querySelector('.role-btn.active')?.dataset.role || 'customer';

    localStorage.setItem('isLoggedIn', 'true');
    localStorage.setItem('userRole',   role);
    localStorage.setItem('userEmail',  email);

    window.location.href = role === 'admin' ? 'admin.html' : 'main.html';
}

window.togglePassword = () => {
    const input  = document.getElementById('password');
    const toggle = document.querySelector('.toggle-password');
    const isText = input.type === 'text';
    input.type          = isText ? 'password' : 'text';
    if (toggle) toggle.textContent = isText ? 'Показать' : 'Скрыть';
};

/* Generic toggle for register page (multiple password fields) */
window.toggleRegPassword = (inputId, btn) => {
    const input = document.getElementById(inputId);
    if (!input) return;
    const isText    = input.type === 'text';
    input.type      = isText ? 'password' : 'text';
    btn.textContent = isText ? 'Показать' : 'Скрыть';
};

/* ===== REGISTER FORM ===== */
(function setupRegisterForm() {
    const form = document.getElementById('registerForm');
    if (!form) return;

    form.addEventListener('submit', function (e) {
        e.preventDefault();

        const name      = document.getElementById('regName').value.trim();
        const email     = document.getElementById('regEmail').value.trim();
        const password  = document.getElementById('regPassword').value;
        const confirm   = document.getElementById('regPasswordConfirm').value;
        const errorDiv   = document.getElementById('errorMessage');
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

        /* Stub: сохраняем пользователя и перенаправляем на главную */
        localStorage.setItem('isLoggedIn', 'true');
        localStorage.setItem('userRole',   'customer');
        localStorage.setItem('userEmail',  email);

        successDiv.textContent = '✅ Регистрация прошла успешно! Перенаправляем...';
        successDiv.classList.add('show');

        setTimeout(() => { window.location.href = 'main.html'; }, 1500);
    });
})();

function checkAuth() {
    const isLoggedIn = localStorage.getItem('isLoggedIn');
    const email      = localStorage.getItem('userEmail');
    const userRole   = localStorage.getItem('userRole');

    if (elements.userInfo && elements.logoutBtn && elements.loginLink) {
        if (isLoggedIn === 'true') {
            elements.userInfo.textContent  = email || '';
            elements.userInfo.style.display   = 'inline';
            elements.logoutBtn.style.display  = 'inline-block';
            elements.loginLink.style.display  = 'none';
        } else {
            elements.userInfo.style.display   = 'none';
            elements.logoutBtn.style.display  = 'none';
            elements.loginLink.style.display  = 'inline-block';
        }
    }

    if (elements.adminLink) {
        elements.adminLink.style.display =
            (isLoggedIn === 'true' && userRole === 'admin') ? 'inline-block' : 'none';
    }
}

window.logout = () => {
    localStorage.removeItem('userRole');
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('userEmail');
    window.location.href = 'main.html';
};

window.goToAdmin = () => {
    const isLoggedIn = localStorage.getItem('isLoggedIn');
    const userRole   = localStorage.getItem('userRole');

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

window.showMore = () => {
    alert('FreshMarket — это сервис быстрой доставки свежих продуктов.\n\n✅ Доставка за 15 минут\n✅ Только свежие продукты\n✅ Удобное приложение\n✅ Выгодные цены');
};

/* ===== EVENT LISTENERS ===== */
function setupEventListeners() {
    if (elements.cartBtn)  elements.cartBtn.addEventListener('click', openModal);
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
function setupHeroAnimation() {
    const heroVisual = document.querySelector('.hero-visual');
    const items      = document.querySelectorAll('.item');
    if (!heroVisual || window.innerWidth <= 992) return;

    let trackingEnabled = false;
    setTimeout(() => { trackingEnabled = true; }, 2000);

    heroVisual.addEventListener('mousemove', (e) => {
        if (!trackingEnabled) return;
        const rect = heroVisual.getBoundingClientRect();
        const xPct = (e.clientX - rect.left) / rect.width  - 0.5;
        const yPct = (e.clientY - rect.top)  / rect.height - 0.5;

        items.forEach((item, i) => {
            const intensity = (i + 1) * 15;
            item.style.transform =
                `translate(${xPct * intensity}px, ${yPct * intensity}px)` +
                ` rotateX(${yPct * -intensity * 1.5}deg)` +
                ` rotateY(${xPct * intensity * 1.5}deg)`;
        });
    });

    heroVisual.addEventListener('mouseleave', () => {
        items.forEach(item => { item.style.transform = ''; });
    });
}

/* ===== ADMIN PANEL ===== */
function showAdminSection(section) {
    const productsSection = document.getElementById('productsSection');
    const ordersSection   = document.getElementById('ordersSection');
    if (!productsSection || !ordersSection) return;

    productsSection.style.display = section === 'products' ? 'block' : 'none';
    ordersSection.style.display   = section === 'orders'   ? 'block' : 'none';

    if (section === 'products') renderAdminProducts();
    else if (section === 'orders') renderAdminOrders();
}

function renderAdminProducts() {
    const tbody = document.getElementById('productsTableBody');
    if (!tbody) return;

    tbody.innerHTML = products.map(p => `
        <tr>
            <td><div class="product-cell"><div class="product-emoji">${p.emoji}</div><span class="product-name">${p.name}</span></div></td>
            <td>${p.price} ₽</td>
            <td><span class="stock-status stock-in">В наличии</span></td>
            <td>
                <div class="action-buttons">
                    <button class="action-btn edit"   onclick="editProduct(${p.id})">Редактировать</button>
                    <button class="action-btn delete" onclick="deleteProduct(${p.id})">Удалить</button>
                </div>
            </td>
        </tr>
    `).join('');

    const total = document.getElementById('totalProducts');
    if (total) total.textContent = products.length;
}

function renderAdminOrders() {
    const tbody = document.getElementById('ordersTableBody');
    if (!tbody) return;

    const orders = [
        { id: 1001, client: 'Иванов И.И.',   total: 1250, status: 'new',        date: '23.03.2026' },
        { id: 1002, client: 'Петрова А.С.',  total: 890,  status: 'processing', date: '23.03.2026' },
        { id: 1003, client: 'Сидоров М.В.',  total: 2100, status: 'delivered',  date: '22.03.2026' },
    ];

    tbody.innerHTML = orders.map(o => `
        <tr>
            <td>#${o.id}</td>
            <td>${o.client}</td>
            <td>${o.total} ₽</td>
            <td>
                <select class="order-status" onchange="updateOrderStatus(${o.id}, this.value)">
                    <option value="new"        ${o.status === 'new'        ? 'selected' : ''}>Новый</option>
                    <option value="processing" ${o.status === 'processing' ? 'selected' : ''}>В обработке</option>
                    <option value="delivered"  ${o.status === 'delivered'  ? 'selected' : ''}>Доставлен</option>
                </select>
            </td>
            <td>${o.date}</td>
            <td><button class="action-btn edit" onclick="viewOrder(${o.id})">Просмотр</button></td>
        </tr>
    `).join('');
}

window.editProduct = (id) => {
    const product = products.find(p => p.id === id);
    if (!product) return;
    const newName = prompt('Новое название:', product.name);
    if (newName) {
        product.name = newName;
        renderAdminProducts();
        showNotification('Товар обновлён');
    }
};

window.deleteProduct = (id) => {
    if (!confirm('Удалить товар?')) return;
    const index = products.findIndex(p => p.id === id);
    if (index > -1) {
        products.splice(index, 1);
        renderAdminProducts();
        displayProducts(products);
        showNotification('Товар удалён');
    }
};

window.openAddProductModal = () => {
    const name  = prompt('Название товара:');
    if (!name) return;
    const price = parseFloat(prompt('Цена:'));
    if (isNaN(price)) { showNotification('Некорректная цена', 'error'); return; }
    const emoji = prompt('Эмодзи (например 🍎):', '📦');

    products.push({ id: Date.now(), name, price, emoji: emoji || '📦', category: 'other', weight: '1 шт' });
    renderAdminProducts();
    displayProducts(products);
    showNotification('Товар добавлен');
};

window.updateOrderStatus = (orderId, status) => {
    console.log(`Order ${orderId} status → ${status}`);
    showNotification('Статус заказа обновлён');
};

window.viewOrder = (orderId) => {
    alert(`Заказ #${orderId}\n\nДетали заказа будут показаны здесь.`);
};

/* ===== LOCAL STORAGE ===== */
function saveCartToStorage() {
    localStorage.setItem('freshmarket_cart', JSON.stringify(cart));
}

function loadCartFromStorage() {
    const saved = localStorage.getItem('freshmarket_cart');
    if (saved) {
        cart = JSON.parse(saved);
        updateCartUI();
    }
}

/* ===== NOTIFICATIONS ===== */
function showNotification(message, type = 'success') {
    if (type === 'error') {
        alert('⚠️ ' + message);
        return;
    }

    const notification = document.createElement('div');
    notification.className   = 'toast-notification';
    notification.textContent = '✅ ' + message;
    document.body.appendChild(notification);

    // Trigger reflow for animation
    notification.getBoundingClientRect();
    notification.classList.add('toast-visible');

    setTimeout(() => {
        notification.classList.remove('toast-visible');
        notification.addEventListener('transitionend', () => notification.remove());
    }, 3000);
}

/* ===== ANIMATION STYLES (injected once) ===== */
const animStyle = document.createElement('style');
animStyle.textContent = `
    .toast-notification {
        position: fixed;
        top: 100px;
        right: 20px;
        background: var(--primary);
        color: #fff;
        padding: 14px 22px;
        border-radius: 12px;
        box-shadow: 0 10px 30px rgba(0,0,0,.18);
        z-index: 10000;
        font-weight: 600;
        font-size: 15px;
        transform: translateX(440px);
        transition: transform .35s cubic-bezier(.175,.885,.32,1.275),
                    opacity .35s ease;
        opacity: 0;
        max-width: calc(100vw - 40px);
    }
    .toast-visible {
        transform: translateX(0);
        opacity: 1;
    }
`;
document.head.appendChild(animStyle);

const ENV = {
    DEVELOPMENT: {
      API_URL: 'https://2762-185-77-216-6.ngrok-free.app', // Ngrok tunnel
    },
    PRODUCTION: {
      API_URL: 'https://ваш-продакшен-сервер.com',
    }
  }
  
const currentEnv = ENV.DEVELOPMENT; // Установите нужную среду (DEVELOPMENT или PRODUCTION)
  
const API_BASE_URL = currentEnv.API_URL;

let currentState = {
    orderData: {
        user_name: null,
        office_name: null,
        dish: null
    },
    cafeData: null
};

const OFFICE_TRANSLATION = {
  North: 'Северного',
  South: 'Южного'
};

const initData = window.Telegram.WebApp.initData; // Данные пользователя Telegram 

document.addEventListener('DOMContentLoaded', async () => {
    // Определяем, является ли клиент Telegram Desktop
    const isTelegramDesktop = window.Telegram.WebApp.platform === 'tdesktop';
    
    if (isTelegramDesktop) {
        // Добавляем специальный класс для десктопной версии
        document.getElementById('office').classList.add('tg-desktop');
    }
    
    Telegram.WebApp.ready();
    Telegram.WebApp.expand();
    await initOfficeSelection();
    
    // Добавляем обработчик для авто-изменения высоты textarea
    const dishTextarea = document.getElementById('dish');
    const userNameTextarea = document.getElementById('userName');
    const searchInput = document.getElementById('search');
    
    // Функция для настройки textarea
    const setupTextarea = (textarea) => {
        if (!textarea) return;
        
        const adjustHeight = () => {
            textarea.style.height = 'auto';
            textarea.style.height = textarea.scrollHeight + 'px';
            textarea.style.overflowY = 'hidden'; // Гарантированно убираем скролл
        };
        
        textarea.addEventListener('input', adjustHeight);
        // Вызываем один раз при загрузке для установки начальной высоты
        adjustHeight();

        // Предотвращаем отправку формы при нажатии Enter
        textarea.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                // Добавляем перенос строки в текущей позиции курсора
                const start = textarea.selectionStart;
                const end = textarea.selectionEnd;
                const text = textarea.value;
                textarea.value = text.substring(0, start) + '\n' + text.substring(end);
                // Устанавливаем курсор после переноса строки
                textarea.selectionStart = textarea.selectionEnd = start + 1;
                adjustHeight();
            }
        });

        // Устанавливаем фокус при клике
        textarea.addEventListener('click', () => {
            textarea.focus();
        });
    };

    // Настраиваем оба textarea
    setupTextarea(dishTextarea);
    setupTextarea(userNameTextarea);

    // Настраиваем поле поиска
    if (searchInput) {
        searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
            }
        });
    }

    // Обработка клика вне полей ввода для скрытия клавиатуры
    document.addEventListener('click', (e) => {
        const isInput = e.target.matches('.text-input, .search-input, .select-box');
        if (!isInput) {
            // Скрываем клавиатуру для всех активных элементов
            const activeElement = document.activeElement;
            if (activeElement && (activeElement.matches('.text-input, .search-input, .select-box'))) {
                activeElement.blur();
                // Принудительно скрываем клавиатуру через Telegram WebApp API
                Telegram.WebApp.HapticFeedback.impactOccurred('light');
            }
        }
    });

    // Добавляем обработчики для всех полей ввода
    const inputs = document.querySelectorAll('.text-input, .search-input');
    inputs.forEach(input => {
        input.addEventListener('click', () => {
            input.focus();
        });
    });
});

function setLoading(element, isLoading) {
    if (isLoading) {
        element.classList.add('loading');
    } else {
        element.classList.remove('loading');
    }
}

async function initOfficeSelection() {
    const step1 = document.getElementById('step1');
    setLoading(step1, true);
    
    try {
        const cafes = await loadCafeData();
        const availableOffices = Object.entries(cafes)
            .filter(([_, data]) => data.checkbox === "TRUE")
            .map(([office]) => office);

        const officeSelect = document.getElementById('office');
        const step1Title = document.getElementById('step1-title');
        const infoMessage = document.getElementById('office-info');
        const submitButton = step1.querySelector('button[type="submit"]');
        const currentDate = new Date().toLocaleDateString('ru-RU', {
            weekday: 'long',
            day: 'numeric',
            month: 'long'
        }).replace(/(\s\d{4})?$/, '');
        
        step1Title.textContent = availableOffices.length > 0 
            ? "Выберите офис для заказа обеда"
            : `Заказы недоступны`;
        
        officeSelect.innerHTML = '';
        
        if (availableOffices.length === 0) {
            officeSelect.style.display = 'none';
            submitButton.style.display = 'none';
            infoMessage.textContent = 'Приносим извинения, попробуйте в следующий рабочий день';
            infoMessage.style.display = 'block';
            setLoading(step1, false);
            return;
        }

        // Показываем кнопку, если есть доступные офисы
        submitButton.style.display = 'block';

        // Добавляем доступные офисы
        availableOffices.forEach(office => {
            const option = document.createElement('option');
            option.value = office;
            option.textContent = office === 'North' ? 'Северный офис' : 'Южный офис';
            officeSelect.appendChild(option);
        });

        // Добавляем информационные сообщения
        const unavailableOffices = Object.entries(cafes)
            .filter(([_, data]) => data.checkbox !== "TRUE")
            .map(([office]) => office);

        if (unavailableOffices.length > 0) {
            const officeNames = unavailableOffices.map(o => 
                o === 'North' ? 'Северного' : 'Южного'
            ).join(' и ');
            infoMessage.textContent = `Заказ для ${officeNames} офиса временно недоступен`;
            infoMessage.style.display = 'block';
        }

    } catch (error) {
        const step1Title = document.getElementById('step1-title');
        step1Title.textContent = 'Ошибка загрузки данных';
        document.getElementById('office-info').textContent = 
            'Пожалуйста, попробуйте позже';
    } finally {
        setLoading(step1, false);
    }
}

function showStep(stepId) {
    document.querySelectorAll('.step').forEach(step => {
        step.classList.remove('active');
    });
    document.getElementById(stepId).classList.add('active');
}

async function loadUsers() {
    const step2 = document.getElementById('step2');
    setLoading(step2, true);
    showStep('step2');
    
    const office = document.getElementById('office').value;
    currentState.orderData.office_name = office;
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/users?office=${office}`, {
            headers: {'ngrok-skip-browser-warning': 'true', 'tuna-skip-browser-warning': 'true'}
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Ошибка сервера');
        }

        const data = await response.json();
        if (!data.success) {
            throw new Error(data.error);
        }

        const userList = document.getElementById('userList');
        userList.innerHTML = data.users.map(user => `
            <div class="user-item" onclick="selectUser('${user}')">
                ${user}
            </div>
        `).join('');
        currentState.cachedUsers = data.users;
    } catch (error) {
        showError(error.message || 'Ошибка загрузки пользователей');
    } finally {
        setLoading(step2, false);
    }
}

function selectUser(userName) {

    // Сначала сбрасываем предыдущее состояние
    document.getElementById('dish').value = '';
    document.getElementById('submitBtn').textContent = 'Подтвердить заказ';

    const userElements = document.querySelectorAll('.user-item');
    const userElement = Array.from(userElements).find(el => el.textContent.includes(userName));
    if (!userElement) {
        showError('Пользователь не найден');
        return;
    }
    userElement.classList.add('selected');
    
    // Ждем завершения анимации перед переходом к следующему шагу
    setTimeout(() => {
        // Мгновенный переход с включением скелетона
        currentState.orderData.user_name = userName;
        const menuOrderSection = document.getElementById('menuAndOrder');
        setLoading(menuOrderSection, true);
        showStep('menuAndOrder');
        
        // Запускаем загрузку данных меню и проверку заказа
        Promise.all([
            showMenuAndOrder(),
            checkExistingOrder(userName)
        ]).catch(console.error);
        
        // Удаляем класс selected после перехода
        userElement.classList.remove('selected');
    }, 1500);
}

async function checkExistingOrder(userName) {
    const menuOrderSection = document.getElementById('menuAndOrder');
    const dishTextarea = document.getElementById('dish');
    try {
        const response = await fetch(
            `${API_BASE_URL}/api/orders/${encodeURIComponent(userName)}?office=${currentState.orderData.office_name}`, 
            { headers: {'ngrok-skip-browser-warning': 'true', 'tuna-skip-browser-warning': 'true'} }
        );
        
        if (!response.ok) return;
        const data = await response.json();
        
        if (data.order) {
            dishTextarea.value = data.order;
            setTimeout(() => {
                dishTextarea.style.height = 'auto'; // Сбрасываем высоту
                dishTextarea.style.height = dishTextarea.scrollHeight + 'px'; // Устанавливаем новую высоту
                dishTextarea.scrollTop = dishTextarea.scrollHeight; // Прокручиваем вниз
            }, 10);
            document.getElementById('submitBtn').textContent = 'Изменить заказ';
        }
    } catch (error) {
        console.error('Error checking existing order:', error);
    } finally {
        // Выключаем скелетоны после всех операций
        setLoading(menuOrderSection, false);
    }
}

// Заменяем вызов showMenuLink() и showOrderForm()
async function showMenuAndOrder() {
    try {
        // Загружаем данные кафе
        const cafes = await loadCafeData();
        const office = currentState.orderData.office_name;
        const cafeInfo = cafes[office];
        
        // Обновляем информацию о меню
        document.getElementById('officeName').textContent = OFFICE_TRANSLATION[office];
        const menuLinkElement = document.querySelector('.menu-link');
        menuLinkElement.href = cafeInfo.menu_url;
        menuLinkElement.textContent = cafeInfo.cafe_name;
        
    } catch (error) {
        console.error('Error loading menu data:', error);
        showError('Ошибка загрузки меню');
    }
}

async function submitOrder() {
    const dishInput = document.getElementById('dish');
    const submitBtn = document.getElementById('submitBtn');
    const backBtn = document.querySelector('#menuAndOrder .btn-back');
    const menuOrderSection = document.getElementById('menuAndOrder');
    
    if (!dishInput.value.trim()) {
        showError('Введите название блюда/блюд');
        return;
    }

    // Блокировка и анимация
    dishInput.disabled = true;
    submitBtn.disabled = true;
    backBtn.disabled = true;
    
    // Добавляем мерцание только кнопкам
    menuOrderSection.classList.add('submitting');
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/orders`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'ngrok-skip-browser-warning': 'true',
                'tuna-skip-browser-warning': 'true',
                'X-Telegram-Init-Data': initData
            },
            body: JSON.stringify({
                username: currentState.orderData.user_name,
                office: currentState.orderData.office_name,
                order: dishInput.value.trim()
            })
        });

        if (!response.ok) throw new Error('Ошибка сохранения');
        const data = await response.json();
        
        if (!data.success) throw new Error(data.error);
        
        // Успешное сохранение
        Telegram.WebApp.showAlert(
            `Заказ "${dishInput.value.trim()}" для пользователя "${currentState.orderData.user_name}" успешно записан в Google Sheets`, 
            () => Telegram.WebApp.close()
        );
    } catch (error) {
        showError(error.message);
    } finally {
        dishInput.disabled = false;
        submitBtn.disabled = false;
        backBtn.disabled = false;
        menuOrderSection.classList.remove('submitting');
    }
}

async function loadCafeData() {
  if (currentState.cafeData) return currentState.cafeData;
  
  try {
    const response = await fetch(`${API_BASE_URL}/api/food-data`, {
      headers: {'ngrok-skip-browser-warning': 'true', 'tuna-skip-browser-warning': 'true'}
    });
    if (!response.ok) throw new Error('Ошибка загрузки данных');
    
    const data = await response.json();
    if (!data.success) throw new Error(data.error);
    
    currentState.cafeData = data.cafes; // Кешируем
    return data.cafes;
  } catch (error) {
    console.error('Cafe data load failed:', error);
    throw error;
  }
}

// Вспомогательные функции
function showError(message) {
    const statusDiv = document.getElementById('orderStatus');
    statusDiv.textContent = message;
    statusDiv.style.color = '#FD6F3D';
    setTimeout(() => statusDiv.textContent = '', 3000);
}

function showNameInput() {
    showStep('newUser');
}

async function addUser() {
    const userName = document.getElementById('userName').value.trim();
    if (!userName) {
        showError('Введите имя пользователя');
        return;
    }

    // Мгновенный переход с включением скелетона
    currentState.orderData.user_name = userName;
    const menuOrderSection = document.getElementById('menuAndOrder');
    setLoading(menuOrderSection, true);
    showStep('menuAndOrder');
    
    // Запускаем загрузку данных меню и проверку заказа
    Promise.all([
        showMenuAndOrder(),
        checkExistingOrder(userName)
    ]).catch(console.error);
}

function backToStep1() {
    showStep('step1');
}

async function filterUsers() {
    const searchTerm = document.getElementById('search').value.toLowerCase();
    
    try {
        // Получаем пользователей только при первом переходе на шаг 2
        if (!currentState.cachedUsers) {
            const response = await fetch(`${API_BASE_URL}/api/users?office=${currentState.orderData.office_name}`, {
                headers: {'ngrok-skip-browser-warning': 'true', 'tuna-skip-browser-warning': 'true'}
            });
            const data = await response.json();
            currentState.cachedUsers = data.users;
        }

        const filtered = currentState.cachedUsers.filter(u => 
            u.toLowerCase().includes(searchTerm)
        );

        const userList = document.getElementById('userList');
        userList.innerHTML = filtered.map(user => `
            <div class="user-item" onclick="selectUser('${user}')">
                ${user}
            </div>
        `).join('');
    } catch (error) {
        showError('Ошибка фильтрации');
    }
}

function backToStep2() {
    // Сбрасываем состояние заказа
    document.getElementById('dish').value = '';
    document.getElementById('submitBtn').textContent = 'Подтвердить заказ';
    document.getElementById('orderStatus').textContent = '';
    
    // Сбрасываем кэшированных пользователей и поиск
    document.getElementById('search').value = '';
    currentState.cachedUsers = null;
    
    showStep('step2');
    filterUsers(); // Обновляем список пользователей
}

function backToMenuLink() {
    showStep('menuLink');
}
const ENV = {
    DEVELOPMENT: {
      API_URL: 'https://15a3-185-77-216-6.ngrok-free.app', // ngrok URL
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

document.addEventListener('DOMContentLoaded', async () => {
    Telegram.WebApp.ready();
    Telegram.WebApp.expand();
    await initOfficeSelection();
    
    // Добавляем обработчик для авто-изменения высоты textarea
    const dishTextarea = document.getElementById('dish');
    if (dishTextarea) {
        const adjustHeight = () => {
            dishTextarea.style.height = 'auto';
            dishTextarea.style.height = dishTextarea.scrollHeight + 'px';
        };
        
        dishTextarea.addEventListener('input', adjustHeight);
        // Вызываем один раз при загрузке для установки начальной высоты
        adjustHeight();

        // Предотвращаем отправку формы при нажатии Enter
        dishTextarea.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
            }
        });
    }
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
            infoMessage.textContent = 'Приносим извинения, попробуйте в следующий рабочий день';
            infoMessage.style.display = 'block';
            setLoading(step1, false);
            return;
        }

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
            headers: {'ngrok-skip-browser-warning': 'true'}
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
    try {
        const response = await fetch(
            `${API_BASE_URL}/api/orders/${encodeURIComponent(userName)}?office=${currentState.orderData.office_name}`, 
            { headers: {'ngrok-skip-browser-warning': 'true'} }
        );
        
        if (!response.ok) return;
        const data = await response.json();
        
        if (data.order) {
            document.getElementById('dish').value = data.order;
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
            headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' },
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
      headers: {'ngrok-skip-browser-warning': 'true'}
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
                headers: {'ngrok-skip-browser-warning': 'true'}
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
    showStep('step2');
    // Сброс поиска при возврате
    document.getElementById('search').value = '';
    filterUsers();
}

function backToMenuLink() {
    showStep('menuLink');
}
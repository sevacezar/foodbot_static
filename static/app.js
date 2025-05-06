const ENV = {
    DEVELOPMENT: {
      API_URL: 'https://330e-185-77-216-6.ngrok-free.app', // ngrok URL
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

document.addEventListener('DOMContentLoaded', () => {
    Telegram.WebApp.ready();
    Telegram.WebApp.expand();
});

function showStep(stepId) {
    document.querySelectorAll('.step').forEach(step => {
        step.classList.remove('active');
    });
    document.getElementById(stepId).classList.add('active');
}

async function loadUsers() {
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
        showStep('step2');
    } catch (error) {
        showError(error.message || 'Ошибка загрузки пользователей');
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
    
    setTimeout(() => {
        currentState.orderData.user_name = userName;
        checkExistingOrder(userName);
        showMenuLink();
        userElement.classList.remove('selected');
    }, 800);
}

async function checkExistingOrder(userName) {
    try {
        const response = await fetch(
            `${API_BASE_URL}/api/orders/${encodeURIComponent(userName)}?office=${currentState.orderData.office_name}`, 
            {
                headers: {'ngrok-skip-browser-warning': 'true'}
            }
        );
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Ошибка проверки заказа');
        }
        
        const data = await response.json();
        
        if (data.order) {
            document.getElementById('dish').value = data.order;
            document.getElementById('submitBtn').textContent = 'Изменить заказ';
        }
    } catch (error) {
        console.error('Order check failed:', error);
        showError('Ошибка проверки заказа');
    }
}

async function showMenuLink() {
  try {
    const cafes = await loadCafeData();
    const office = currentState.orderData.office_name;
    
    // Обновляем текст
    document.getElementById('officeName').textContent = OFFICE_TRANSLATION[office];
    
    // Обновляем ссылку и название
    const menuLink = document.querySelector('.menu-link');
    const cafeInfo = cafes[office];
    menuLink.href = cafeInfo.menu_url;
    menuLink.innerHTML = `${cafeInfo.cafe_name} →`;
    
    showStep('menuLink');
  } catch (error) {
    console.error('Ошибка:', error);
    backToStep2();
  }
}


function showOrderForm() {
    showStep('orderForm');
}

async function submitOrder() {
    const dishInput = document.getElementById('dish');
    if (!dishInput.value.trim()) {
        showError('Введите название блюда/блюд');
        return;
    }

    currentState.orderData.dish = dishInput.value.trim();

    try {
        const response = await fetch(`${API_BASE_URL}/api/orders`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' },
            body: JSON.stringify({
                username: currentState.orderData.user_name,
                office: currentState.orderData.office_name,
                order: currentState.orderData.dish
        })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Ошибка сохранения');
        }

        const data = await response.json();
        if (!data.success) {
            throw new Error(data.error);
        }

        Telegram.WebApp.showAlert('Заказ успешно сохранён!', () => {
            Telegram.WebApp.close();
        });
    } catch (error) {
        showError(error.message || 'Ошибка сохранения заказа');
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
    showError('Не удалось загрузить меню');
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

    currentState.orderData.user_name = userName;
    showMenuLink();
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
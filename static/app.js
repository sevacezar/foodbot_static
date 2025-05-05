const ENV = {
    DEVELOPMENT: {
      API_URL: 'https://eafd-185-77-216-6.ngrok-free.app/', // ngrok URL
    },
    PRODUCTION: {
      API_URL: 'https://ваш-продакшен-сервер.com',
    }
  }
  
const currentEnv = ENV.DEVELOPMENT; // Установите нужную среду (DEVELOPMENT или PRODUCTION)
  
const API_BASE_URL = currentEnv.API_URL;

let currentState = {
    office: null,
    user: null,
    isNewUser: false,
    orderData: {
        user_name: null,
        office_name: null,
        create_user: false,
        dish: null
    }
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
    currentState.office = office;
    currentState.orderData.office_name = office === 'north' ? 'North' : 'South';
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/users?office=${office}`);
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
        
        showStep('step2');
    } catch (error) {
        showError(error.message || 'Ошибка загрузки пользователей');
    }
}

function selectUser(userName) {
    const userElement = document.querySelector(`.user-item:contains('${userName}')`);
    
    userElement.classList.add('selected');
    
    setTimeout(() => {
        currentState.user = { name: userName };
        currentState.orderData.user_name = userName;
        currentState.orderData.create_user = false;
        checkExistingOrder(userName);
        showMenuLink();
        userElement.classList.remove('selected');
    }, 800);
}

async function checkExistingOrder(userName) {
    try {
        const response = await etch(`${API_BASE_URL}/api/orders/${encodeURIComponent(userName)}?office=${currentState.orderData.office_name}`);
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

function showMenuLink() {
    document.getElementById('officeName').textContent = currentState.orderData.office_name;
    showStep('menuLink');
}

function showOrderForm() {
    showStep('orderForm');
    
    if (currentState.isNewUser) {
        document.getElementById('dish').value = '';
        document.getElementById('submitBtn').textContent = 'Сделать заказ';
    }
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
            headers: { 'Content-Type': 'application/json' },
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

// Вспомогательные функции
function showError(message) {
    const statusDiv = document.getElementById('orderStatus');
    statusDiv.textContent = message;
    statusDiv.style.color = '#FD6F3D';
    setTimeout(() => statusDiv.textContent = '', 3000);
}

function showNameInput() {
    currentState.isNewUser = true;
    showStep('newUser');
}

async function addUser() {
    const userName = document.getElementById('userName').value.trim();
    if (!userName) return;

    try {
        const response = await fetch('/api/users', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: userName,
                office: currentState.office
            })
        });

        if (response.ok) {
            currentState.user = { name: userName };
            currentState.orderData.user_name = userName;
            currentState.orderData.create_user = true;
            showMenuLink();
        } else {
            showError('Ошибка создания пользователя');
        }
    } catch (error) {
        showError('Ошибка сети');
    }
}

function backToStep1() {
    showStep('step1');
}

async function filterUsers() {
    const searchTerm = document.getElementById('search').value.toLowerCase();
    
    try {
        // Получаем пользователей только при первом переходе на шаг 2
        if (!currentState.cachedUsers) {
            const response = await fetch(`/api/users?office=${currentState.office}`);
            currentState.cachedUsers = await response.json();
        }

        const filtered = currentState.cachedUsers.filter(u => 
            u.name.toLowerCase().includes(searchTerm)
        );

        const userList = document.getElementById('userList');
        userList.innerHTML = filtered.map(user => `
            <div class="user-item" onclick="selectUser('${user.name}')">
                ${user.name}
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
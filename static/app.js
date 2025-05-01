let currentState = {
    office: null,
    user: null,
    isNewUser: false
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
    
    try {
        const response = await fetch(`/api/users?office=${office}`);
        const users = await response.json();
        
        const userList = document.getElementById('userList');
        userList.innerHTML = users.map(user => `
            <div class="user-item" data-id="${user.id}" onclick="selectUser(${user.id}, '${user.name}')">
                ${user.name}
            </div>
        `).join('');
        
        showStep('step2');
    } catch (error) {
        showError('Ошибка загрузки пользователей');
    }
}

function selectUser(userId, userName) {
    currentState.user = { id: userId, name: userName };
    checkExistingOrder(userId);
    showMenuLink();
}

async function checkExistingOrder(userId) {
    try {
        const response = await fetch(`/api/orders/${userId}`);
        const order = await response.json();
        
        if (order.dish) {
            document.getElementById('dish').value = order.dish;
            document.getElementById('submitBtn').textContent = 'Изменить заказ';
        }
    } catch (error) {
        console.error('Order check failed:', error);
    }
}

function showMenuLink() {
    document.getElementById('officeName').textContent = 
        currentState.office === 'north' ? 'Северного' : 'Южного';
    showStep('menuLink');
}

async function submitOrder() {
    const dishInput = document.getElementById('dish');
    if (!dishInput.value.trim()) {
        showError('Введите название блюда');
        return;
    }

    try {
        const response = await fetch('/api/orders', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                user_id: currentState.user.id,
                dish: dishInput.value.trim()
            })
        });

        if (response.ok) {
            Telegram.WebApp.showAlert('Заказ успешно сохранён!', () => {
                Telegram.WebApp.close();
            });
        } else {
            showError('Ошибка сохранения заказа');
        }
    } catch (error) {
        showError('Ошибка сети');
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

    // Моковая реализация добавления пользователя
    currentState.user = { 
        id: Date.now(), 
        name: userName,
        office: currentState.office
    };
    showMenuLink();
}
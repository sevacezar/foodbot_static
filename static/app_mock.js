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

// Моковые данные
const mockUsers = [
    { name: "Иван Петров", office: "north" },
    { name: "Мария Сидорова", office: "south" },
    { name: "Алексей Иванов", office: "north" },
    { name: "Ольга Николаева", office: "south" },
    { name: "Дмитрий Смирнов", office: "north" },
    { name: "Екатерина Волкова", office: "south" },
    { name: "Сергей Попов", office: "north" },
    { name: "Анна Новикова", office: "south" },
    { name: "Андрей Морозов", office: "north" },
    { name: "Юлия Зайцева", office: "south" },
    { name: "Павел Павлов", office: "north" },
    { name: "Татьяна Семенова", office: "south" },
    { name: "Николай Федоров", office: "north" },
    { name: "Елена Петрова", office: "south" },
    { name: "Артем Козлов", office: "north" },
    { name: "Оксана Лебедева", office: "south" },
    { name: "Владимир Соколов", office: "north" },
    { name: "Марина Крылова", office: "south" },
    { name: "Григорий Новиков", office: "north" },
    { name: "Виктория Степанова", office: "south" }
];

let mockOrders = {
    "Иван Петров": "Стейк с овощами",
    "Мария Сидорова": "Салат Цезарь"
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
    currentState.orderData.office_name = office === 'north' ? 'Северный' : 'Южный';
    
    // МОК: Вместо запроса к API
    const users = mockUsers.filter(u => u.office === office);
    const userList = document.getElementById('userList');
    userList.innerHTML = users.map(user => `
        <div class="user-item" onclick="selectUser('${user.name}')">
            ${user.name}
        </div>
    `).join('');

    showStep('step2');
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
    // МОК: Проверка существующего заказа
    setTimeout(() => { // Имитация задержки сети
        if (mockOrders[userName]) {
            document.getElementById('dish').value = mockOrders[userName];
            document.getElementById('submitBtn').textContent = 'Изменить заказ';
        }
    }, 300);
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
        showError('Введите название блюда');
        return;
    }

    currentState.orderData.dish = dishInput.value.trim();

    // МОК: Имитация POST-запроса
    try {
        console.log('Sending order data:', currentState.orderData);
        // Имитация задержки сети
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Сохраняем заказ в моковые данные
        mockOrders[currentState.orderData.user_name] = currentState.orderData.dish;
        
        // Имитация успешного ответа
        Telegram.WebApp.showAlert('Заказ успешно сохранён!', () => {
            Telegram.WebApp.close();
        });
    } catch (error) {
        showError('Ошибка при отправке заказа');
    }
}

async function addUser() {
    const userName = document.getElementById('userName').value.trim();
    if (!userName) return;

    // Проверяем, не существует ли уже такой пользователь
    if (mockUsers.some(u => u.name === userName && u.office === currentState.office)) {
        showError('Такой пользователь уже существует');
        return;
    }
    
    mockUsers.push({
        name: userName,
        office: currentState.office
    });
    
    currentState.user = { name: userName };
    currentState.orderData.user_name = userName;
    currentState.orderData.create_user = true;
    
    showMenuLink();
}

// Остальные функции без изменений
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

function backToStep2() {
    showStep('step2');
    // Сброс поиска при возврате
    document.getElementById('search').value = '';
    filterUsers();
}

function filterUsers() {
    const searchTerm = document.getElementById('search').value.toLowerCase();
    const filtered = mockUsers.filter(u => 
        u.office === currentState.office &&
        u.name.toLowerCase().includes(searchTerm)
    );
    
    const userList = document.getElementById('userList');
    userList.innerHTML = filtered.map(user => `
        <div class="user-item" onclick="selectUser('${user.name}')">
            ${user.name}
        </div>
    `).join('');
}


function backToStep1() {
    showStep('step1');
}


function backToMenuLink() {
    showStep('menuLink');
}
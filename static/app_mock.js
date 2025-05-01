let currentState = {
    office: null,
    user: null,
    isNewUser: false
};

// Моковые данные
const mockUsers = [
    { id: 1, name: "Иван Петров", office: "north" },
    { id: 2, name: "Мария Сидорова", office: "south" },
    { id: 3, name: "Алексей Иванов", office: "north" },
    { id: 4, name: "Ольга Николаева", office: "south" },
    { id: 5, name: "Дмитрий Смирнов", office: "north" },
    { id: 6, name: "Екатерина Волкова", office: "south" },
    { id: 7, name: "Сергей Попов", office: "north" },
    { id: 8, name: "Анна Новикова", office: "south" },
    { id: 9, name: "Андрей Морозов", office: "north" },
    { id: 10, name: "Юлия Зайцева", office: "south" },
    { id: 11, name: "Павел Павлов", office: "north" },
    { id: 12, name: "Татьяна Семенова", office: "south" },
    { id: 13, name: "Николай Федоров", office: "north" },
    { id: 14, name: "Елена Петрова", office: "south" },
    { id: 15, name: "Артем Козлов", office: "north" },
    { id: 16, name: "Оксана Лебедева", office: "south" },
    { id: 17, name: "Владимир Соколов", office: "north" },
    { id: 18, name: "Марина Крылова", office: "south" },
    { id: 19, name: "Григорий Новиков", office: "north" },
    { id: 20, name: "Виктория Степанова", office: "south" }
];

let mockOrders = {
    1: "Стейк с овощами",
    2: "Салат Цезарь"
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
    
    // МОК: Вместо запроса к API
    const users = mockUsers.filter(u => u.office === office);
    const userList = document.getElementById('userList');
    userList.innerHTML = users.map(user => `
        <div class="user-item" data-id="${user.id}" onclick="selectUser(${user.id}, '${user.name}')">
            ${user.name}
        </div>
    `).join('');

    showStep('step2');
}

function selectUser(userId, userName) {
    currentState.user = { id: userId, name: userName };
    checkExistingOrder(userId);
    showMenuLink();
}

async function checkExistingOrder(userId) {
    // МОК: Проверка существующего заказа
    setTimeout(() => { // Имитация задержки сети
        if (mockOrders[userId]) {
            document.getElementById('dish').value = mockOrders[userId];
            document.getElementById('submitBtn').textContent = 'Изменить заказ';
        }
    }, 300);
}

function showMenuLink() {
    document.getElementById('officeName').textContent = 
        currentState.office === 'north' ? 'Северного' : 'Южного';
    showStep('menuLink');
}

function showOrderForm() {
    showStep('orderForm');
    
    // Если пользователь новый - сразу показать пустое поле
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

    // МОК: Сохранение заказа
    setTimeout(() => { // Имитация асинхронного запроса
        mockOrders[currentState.user.id] = dishInput.value.trim();
        Telegram.WebApp.showAlert('Заказ успешно сохранён!', () => {
            Telegram.WebApp.close();
        });
    }, 500);
}

// МОК: Добавление нового пользователя
async function addUser() {
    const userName = document.getElementById('userName').value.trim();
    if (!userName) return;

    // Генерация "уникального" ID
    const newUserId = Math.max(...mockUsers.map(u => u.id)) + 1;
    
    mockUsers.push({
        id: newUserId,
        name: userName,
        office: currentState.office
    });
    
    currentState.user = { 
        id: newUserId, 
        name: userName
    };
    
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
}

function filterUsers() {
    const searchTerm = document.getElementById('search').value.toLowerCase();
    const filtered = mockUsers.filter(u => 
        u.office === currentState.office &&
        u.name.toLowerCase().includes(searchTerm)
    );
    
    const userList = document.getElementById('userList');
    userList.innerHTML = filtered.map(user => `
        <div class="user-item" data-id="${user.id}" onclick="selectUser(${user.id}, '${user.name}')">
            ${user.name}
        </div>
    `).join('');
}


function backToStep1() {
    showStep('step1');
}
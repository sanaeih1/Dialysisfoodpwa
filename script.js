// تابع تولید شناسه یکتا (UUID)
function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        var r = Math.random() * 16 | 0,
            v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

// دریافت شناسه کاربر (اگر وجود نداشت، ایجاد می‌شود)
let userId = localStorage.getItem('userId');
if (!userId) {
    userId = generateUUID();
    localStorage.setItem('userId', userId);
}

// تابع ذخیره داده برای کاربر فعلی
function saveData(data) {
    localStorage.setItem(`userData_${userId}`, JSON.stringify(data));
}

// تابع دریافت داده برای کاربر فعلی
function getData() {
    const data = localStorage.getItem(`userData_${userId}`);
    return data ? JSON.parse(data) : null;
}

// بارگذاری داده‌های اولیه
let userData = getData();
let foodDB = (userData && userData.foodDB) || [
    { name: 'مرغ', sodium: 70, potassium: 280, phosphorus: 200, water: 65 },
    { name: 'برنج', sodium: 5, potassium: 35, phosphorus: 40, water: 70 },
    { name: 'سیب زمینی', sodium: 10, potassium: 400, phosphorus: 50, water: 80 },
    { name: 'شیر', sodium: 50, potassium: 350, phosphorus: 250, water: 90 },
    { name: 'نان', sodium: 200, potassium: 80, phosphorus: 70, water: 40 },
    { name: 'تخم مرغ', sodium: 60, potassium: 70, phosphorus: 90, water: 75 },
    { name: 'ماست', sodium: 80, potassium: 150, phosphorus: 120, water: 85 },
    { name: 'خیار', sodium: 5, potassium: 150, phosphorus: 20, water: 95 },
    { name: 'گوجه فرنگی', sodium: 10, potassium: 250, phosphorus: 30, water: 90 },
    { name: 'هویج', sodium: 15, potassium: 300, phosphorus: 35, water: 88 }
];
let dailyIntake = (userData && userData.dailyIntake) || [];
let settings = (userData && userData.settings) || {
    sodiumLimit: 2000,
    potassiumLimit: 2000,
    phosphorusLimit: 1000,
    waterLimit: 1500
};
let themeSettings = (userData && userData.themeSettings) || { fontSize: '1' };
let currentEditIndex = null;

// تنظیمات نمودارها
const sodiumChart = new Chart(document.getElementById('sodiumChart'), {
    type: 'doughnut',
    data: {
        labels: ['مصرف شده', 'باقی مانده'], datasets: [{
            data: [0, 100],
            backgroundColor: ['rgba(255, 99, 132, 0.7)', 'rgba(220,220,220,0.7)'],
            borderColor: ['rgba(255, 99, 132, 1)', 'rgba(220,220,220,1)'],
            borderWidth: 1
        }]
    },
    options: { responsive: true, maintainAspectRatio: false, cutout: '70%', plugins: { legend: { display: false } } }
});

const potassiumChart = new Chart(document.getElementById('potassiumChart'), {
    type: 'doughnut',
    data: {
        labels: ['مصرف شده', 'باقی مانده'], datasets: [{
            data: [0, 100],
            backgroundColor: ['rgba(54, 162, 235, 0.7)', 'rgba(220,220,220,0.7)'],
            borderColor: ['rgba(54, 162, 235, 1)', 'rgba(220,220,220,1)'],
            borderWidth: 1
        }]
    },
    options: { responsive: true, maintainAspectRatio: false, cutout: '70%', plugins: { legend: { display: false } } }
});

const phosphorusChart = new Chart(document.getElementById('phosphorusChart'), {
    type: 'doughnut',
    data: {
        labels: ['مصرف شده', 'باقی مانده'], datasets: [{
            data: [0, 100],
            backgroundColor: ['rgba(255, 206, 86, 0.7)', 'rgba(220,220,220,0.7)'],
            borderColor: ['rgba(255, 206, 86, 1)', 'rgba(220,220,220,1)'],
            borderWidth: 1
        }]
    },
    options: { responsive: true, maintainAspectRatio: false, cutout: '70%', plugins: { legend: { display: false } } }
});

const waterChart = new Chart(document.getElementById('waterChart'), {
    type: 'doughnut',
    data: {
        labels: ['مصرف شده', 'باقی مانده'], datasets: [{
            data: [0, 100],
            backgroundColor: ['rgba(75, 192, 192, 0.7)', 'rgba(220,220,220,0.7)'],
            borderColor: ['rgba(75, 192, 192, 1)', 'rgba(220,220,220,1)'],
            borderWidth: 1
        }]
    },
    options: { responsive: true, maintainAspectRatio: false, cutout: '70%', plugins: { legend: { display: false } } }
});

// توابع اصلی
function showSection(sectionId) {
    document.querySelectorAll('.section').forEach(section => section.classList.remove('active'));
    document.getElementById(sectionId).classList.add('active');
    document.querySelectorAll('.nav button').forEach(button => button.classList.remove('active'));
    document.querySelector(`.nav button[onclick="showSection('${sectionId}')"]`).classList.add('active');
}

function updateChart() {
    let currentTotals = calculateCurrentTotals();
    let sodiumPercentage = Math.min((currentTotals.sodium / settings.sodiumLimit) * 100, 100);
    let potassiumPercentage = Math.min((currentTotals.potassium / settings.potassiumLimit) * 100, 100);
    let phosphorusPercentage = Math.min((currentTotals.phosphorus / settings.phosphorusLimit) * 100, 100);
    let waterPercentage = Math.min((currentTotals.water / settings.waterLimit) * 100, 100);

    sodiumChart.data.datasets[0].data = [sodiumPercentage, 100 - sodiumPercentage];
    potassiumChart.data.datasets[0].data = [potassiumPercentage, 100 - potassiumPercentage];
    phosphorusChart.data.datasets[0].data = [phosphorusPercentage, 100 - phosphorusPercentage];
    waterChart.data.datasets[0].data = [waterPercentage, 100 - waterPercentage];

    sodiumChart.update();
    potassiumChart.update();
    phosphorusChart.update();
    waterChart.update();

    document.getElementById('sodiumPercentage').textContent = `${sodiumPercentage.toFixed(0)}%`;
    document.getElementById('potassiumPercentage').textContent = `${potassiumPercentage.toFixed(0)}%`;
    document.getElementById('phosphorusPercentage').textContent = `${phosphorusPercentage.toFixed(0)}%`;
    document.getElementById('waterPercentage').textContent = `${waterPercentage.toFixed(0)}%`;

    document.getElementById('sodiumValue').textContent = `${currentTotals.sodium} میلی گرم`;
    document.getElementById('potassiumValue').textContent = `${currentTotals.potassium} میلی گرم`;
    document.getElementById('phosphorusValue').textContent = `${currentTotals.phosphorus} میلی گرم`;
    document.getElementById('waterValue').textContent = `${currentTotals.water} میلی لیتر`;
}

function calculateCurrentTotals() {
    let totals = { sodium: 0, potassium: 0, phosphorus: 0, water: 0 };
    dailyIntake.forEach(item =>
    dailyIntake.forEach(item => {
            let food = foodDB.find(f => f.name === item.foodName);
            if (food) {
                totals.sodium += food.sodium * item.amount;
                totals.potassium += food.potassium * item.amount;
                totals.phosphorus += food.phosphorus * item.amount;
                totals.water += food.water * item.amount;
            }        });
        return {
            sodium: Math.round(totals.sodium),
            potassium: Math.round(totals.potassium),
            phosphorus: Math.round(totals.phosphorus),
            water: Math.round(totals.water)
        };
    }

    function updateCurrentTotalsDisplay() {
        let currentTotals = calculateCurrentTotals();
        document.getElementById('currentTotals').innerHTML = `
            <p>سدیم: ${currentTotals.sodium} میلی گرم</p>
            <p>پتاسیم: ${currentTotals.potassium} میلی گرم</p>
            <p>فسفر: ${currentTotals.phosphorus} میلی گرم</p>
            <p>آب: ${currentTotals.water} میلی لیتر</p>
        `;    }

    function addFoodEntry(event) {
        event.preventDefault();
        const foodName = document.getElementById('foodSelect').value;
        const amount = parseInt(document.getElementById('amount').value);
        const mealType = document.getElementById('mealType').value;
        const dayOfWeek = document.getElementById('dayOfWeek').value;

        const mealTypeFa = { 'breakfast': 'صبحانه', 'lunch': 'ناهار', 'dinner': 'شام' }[mealType];
        const dayOfWeekFa = {
            'saturday': 'شنبه', 'sunday': 'یکشنبه', 'monday': 'دوشنبه',
            'tuesday': 'سه شنبه', 'wednesday': 'چهارشنبه', 'thursday': 'پنج شنبه', 'friday': 'جمعه'
        }[dayOfWeek];

        dailyIntake.push({ foodName, amount, mealType: mealTypeFa, dayOfWeek: dayOfWeekFa });
        userData = getData() || {};
        userData.dailyIntake = dailyIntake;
        saveData(userData);

        updateChart();
        updateCurrentTotalsDisplay();
        checkLimits();
        document.getElementById('amount').value = '';
        updateFaceStickers();
        updateHistoryTable();
    }

    function updateFoodSelect() {
        const foodSelect = document.getElementById('foodSelect');
        foodSelect.innerHTML = '';
        foodDB.forEach(food => {
            const option = document.createElement('option');
            option.value = food.name;
            option.textContent = food.name;
            foodSelect.appendChild(option);
        });
    }

    function addNewFood(event) {
        event.preventDefault();
        const newFood = {
            name: document.getElementById('newFoodName').value,
            sodium: parseInt(document.getElementById('sodium').value),
            potassium: parseInt(document.getElementById('potassium').value),
            phosphorus: parseInt(document.getElementById('phosphorus').value),
            water: parseInt(document.getElementById('water').value)
        };
        foodDB.push(newFood);
        userData = getData() || {};
        userData.foodDB = foodDB;
        saveData(userData);
        updateEducationDB();
        updateFoodSelect();
        document.getElementById('newFoodName').value = '';
        document.getElementById('sodium').value = '';
        document.getElementById('potassium').value = '';
        document.getElementById('phosphorus').value = '';
        document.getElementById('water').value = '';
    }

    function updateEducationDB() {
        const foodDatabase = document.getElementById('foodDatabase');
        foodDatabase.innerHTML = '';
        foodDB.forEach((food, index) => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${food.name}</td>
                <td>${food.sodium}</td>
                <td>${food.potassium}</td>
                <td>${food.phosphorus}</td>
                <td>${food.water}</td>
                <td>
                    <button onclick="editFoodForm(${index})">ویرایش</button>
                    <button onclick="deleteFood(${index})">حذف</button>
                </td>
            `;
            foodDatabase.appendChild(row);
        });
    }

    function editFoodForm(index) {
        currentEditIndex = index;
        const food = foodDB[index];
        document.getElementById('editFoodIndex').value = index;
        document.getElementById('editFoodName').value = food.name;
        document.getElementById('editSodium').value = food.sodium;
        document.getElementById('editPotassium').value = food.potassium;
        document.getElementById('editPhosphorus').value = food.phosphorus;
        document.getElementById('editWater').value = food.water;
        document.getElementById('editFoodForm').classList.add('active');
    }

    function cancelEdit() {
        document.getElementById('editFoodForm').classList.remove('active');
        currentEditIndex = null;
    }

    function editFood(event) {
        event.preventDefault();
        const index = parseInt(document.getElementById('editFoodIndex').value);
        foodDB[index] = {
            name: document.getElementById('editFoodName').value,
            sodium: parseInt(document.getElementById('editSodium').value),
            potassium: parseInt(document.getElementById('editPotassium').value),
            phosphorus: parseInt(document.getElementById('editPhosphorus').value),
            water: parseInt(document.getElementById('editWater').value)
        };
        userData = getData() || {};
        userData.foodDB = foodDB;
        saveData(userData);
        updateEducationDB();
        updateFoodSelect();
        cancelEdit();
    }

    function deleteFood(index) {
        if (confirm('آیا مطمئن هستید که می‌خواهید این ماده غذایی را حذف کنید؟')) {
            foodDB.splice(index, 1);
            userData = getData() || {};
            userData.foodDB = foodDB;
            saveData(userData);
            updateEducationDB();
            updateFoodSelect();
        }
    }

    function saveSettings(event) {
        event.preventDefault();
        settings.sodiumLimit = parseInt(document.getElementById('sodiumLimit').value);
        settings.potassiumLimit = parseInt(document.getElementById('potassiumLimit').value);
        settings.phosphorusLimit = parseInt(document.getElementById('phosphorusLimit').value);
        settings.waterLimit = parseInt(document.getElementById('waterLimit').value);
        userData = getData() || {};
        userData.settings = settings;
        saveData(userData);
        updateChart();
        checkLimits();
    }

    function resetData() {
        if (confirm('آیا مطمئن هستید که می‌خواهید همه داده‌ها را بازنشانی کنید؟')) {
            localStorage.removeItem(`userData_${userId}`);
            dailyIntake = [];
            foodDB = [ // Reset foodDB to its initial state
                { name: 'مرغ', sodium: 70, potassium: 280, phosphorus: 200, water: 65 },
                { name: 'برنج', sodium: 5, potassium: 35, phosphorus: 40, water: 70 },
                { name: 'سیب زمینی', sodium: 10, potassium: 400, phosphorus: 50, water: 80 },
                { name: 'شیر', sodium: 50, potassium: 350, phosphorus: 250, water: 90 },
                { name: 'نان', sodium: 200, potassium: 80, phosphorus: 70, water: 40 },
                { name: 'تخم مرغ', sodium: 60, potassium: 70, phosphorus: 90, water: 75 },
                { name: 'ماست', sodium: 80, potassium: 150, phosphorus: 120, water: 85 },
                { name: 'خیار', sodium: 5, potassium: 150, phosphorus: 20, water: 95 },
                { name: 'گوجه فرنگی', sodium: 10, potassium: 250, phosphorus: 30, water: 90 },
                { name: 'هویج', sodium: 15, potassium: 300, phosphorus: 35, water: 88 }
            ];
            settings = {  // and settings
                sodiumLimit: 2000,
                potassiumLimit: 2000,
                phosphorusLimit: 1000,
                waterLimit: 1500
            };
            themeSettings = { fontSize: '1' }; // and theme settings
            updateChart();
            updateCurrentTotalsDisplay();
            updateHistoryTable();            checkLimits();
            updateFoodSelect(); // Add this to repopulate the food select
            updateEducationDB();

        }
    }

    function clearHistory() {
        if (confirm('آیا مطمئن هستید که می‌خواهید تاریخچه را پاک کنید؟')) {
            dailyIntake = [];
            userData = getData() || {};
            userData.dailyIntake = dailyIntake;
            saveData(userData);
            updateHistoryTable();
            updateChart();
            updateCurrentTotalsDisplay();
            checkLimits();
        }
    }

    function updateHistoryTable() {
        const historyTable = document.getElementById('historyTable');
        historyTable.innerHTML = '';
        dailyIntake.forEach(item => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${item.foodName}</td>
                <td>${item.amount}</td>
                <td>${item.mealType}</td>
                <td>${item.dayOfWeek}</td>
            `;
            historyTable.appendChild(row);
        });
    }

    function applyTheme() {
        themeSettings.fontSize = document.getElementById('fontSize').value;
        userData = getData() || {};
        userData.themeSettings = themeSettings;
        saveData(userData);
        document.documentElement.style.fontSize = `${themeSettings.fontSize}rem`;
    }

    function checkLimits() {
        let currentTotals = calculateCurrentTotals();
        let warningsDiv = document.getElementById('warnings');
        warningsDiv.innerHTML = '';
        if (currentTotals.sodium > settings.sodiumLimit) {
            warningsDiv.innerHTML += `<div class="warning">خطر: میزان سدیم از حد مجاز (${settings.sodiumLimit} میلی‌گرم) بیشتر است!</div>`;
        }
        if (currentTotals.potassium > settings.potassiumLimit) {
            warningsDiv.innerHTML += `<div class="warning">خطر: میزان پتاسیم از حد مجاز (${settings.potassiumLimit} میلی‌گرم) بیشتر است!</div>`;
        }
        if (currentTotals.phosphorus > settings.phosphorusLimit) {
            warningsDiv.innerHTML += `<div class="warning">خطر: میزان فسفر از حد مجاز (${settings.phosphorusLimit} میلی‌گرم) بیشتر است!</div>`;
        }
        if (currentTotals.water > settings.waterLimit) {
            warningsDiv.innerHTML += `<div class="warning">خطر: میزان آب از حد مجاز (${settings.waterLimit} میلی‌لیتر) بیشتر است!</div>`;
        }
    }

    function updateFaceStickers() {
        let currentTotals = calculateCurrentTotals();

        const sodiumPercentage = Math.min((currentTotals.sodium / settings.sodiumLimit) * 100, 100);
        const potassiumPercentage = Math.min((currentTotals.potassium / settings.potassiumLimit) * 100, 100);
        const phosphorusPercentage = Math.min((currentTotals.phosphorus / settings.phosphorusLimit) * 100, 100);
        const waterPercentage = Math.min((currentTotals.water / settings.waterLimit) * 100, 100);

        document.getElementById('sodiumFaceSticker').textContent = getFaceSticker(sodiumPercentage);
        document.getElementById('potassiumFaceSticker').textContent = getFaceSticker(potassiumPercentage);
        document.getElementById('phosphorusFaceSticker').textContent = getFaceSticker(phosphorusPercentage);
        document.getElementById('waterFaceSticker').textContent = getFaceSticker(waterPercentage);
    }

    function getFaceSticker(percentage) {
        if (percentage < 50) {            return '😊'; // Safe
        } else if (percentage < 80) {
            return '😐'; // Moderate
        } else {
            return '😟'; // Warning
        }
    }

    // Initial setup
    document.documentElement.style.fontSize = `${themeSettings.fontSize}rem`;
    updateFoodSelect();
    updateEducationDB();
    updateHistoryTable();
    updateChart();
    updateCurrentTotalsDisplay();
    checkLimits();
    updateFaceStickers();


    // PWA - Service Worker Registration
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('/service-worker.js')
                .then((registration) => {
                    console.log('ServiceWorker registered:', registration);
                })
                .catch((error) => {
                    console.error('ServiceWorker registration failed:', error);
                });
        });
    }
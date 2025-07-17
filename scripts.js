let pageHistory = [];

function generateDeviceId() {
  const userAgent = navigator.userAgent;
  const randomString = Math.random().toString(36).substring(2, 15);
  return btoa(userAgent + randomString).substring(0, 20);
}

const deviceId = localStorage.getItem('deviceId') || generateDeviceId();
localStorage.setItem('deviceId', deviceId);

const storageKey = `dialysisAppData_${deviceId}`;
let userData = {};
try {
  userData = JSON.parse(localStorage.getItem(storageKey)) || {};
} catch (e) {
  console.error('Error loading data from localStorage:', e);
  userData = {};
}

userData = {
  intakeHistory: userData.intakeHistory || [],
  foodDB: userData.foodDB || [],
  limits: userData.limits || {
    sodium: 2300,
    potassium: 2500,
    phosphorus: 900,
    protein: 80,
    water: 1000
  },
  ibw: userData.ibw || null,
  urineOutput: userData.urineOutput || null,
  minimumUrineOutput: userData.minimumUrineOutput || 500,
  fontSize: userData.fontSize || 'large'
};

let intakeHistory = userData.intakeHistory;
let foodDB = userData.foodDB;
let limits = userData.limits;
let charts = {};

function showLoading() {
  document.getElementById('loadingOverlay').style.display = 'flex';
}

function hideLoading() {
  document.getElementById('loadingOverlay').style.display = 'none';
}

async function loadFoodDatabaseFromJSON() {
  showLoading();
  const jsonURL = 'https://raw.githubusercontent.com/sanaeih1/Dialysisfoodpwa/main/foods.json';
  try {
    const response = await fetch(jsonURL, { cache: 'force-cache' });
    if (!response.ok) {
      throw new Error('خطا در دریافت فایل JSON');
    }
    const newFoods = await response.json();
    const requiredFields = ['name', 'category', 'sodium', 'potassium', 'phosphorus', 'protein', 'water', 'carb', 'fat', 'kcal', 'bloodSugarImpact', 'restrictions', 'unit'];
    const isValid = newFoods.every(food => 
      requiredFields.every(field => food.hasOwnProperty(field)) &&
      typeof food.sodium === 'number' &&
      typeof food.potassium === 'number' &&
      typeof food.phosphorus === 'number' &&
      typeof food.protein === 'number' &&
      typeof food.water === 'number' &&
      typeof food.carb === 'number' &&
      typeof food.fat === 'number' &&
      typeof food.kcal === 'number'
    );

    if (!isValid) {
      showError('فایل JSON ساختار معتبری ندارد یا مقادیر نامعتبر هستند.');
      hideLoading();
      return;
    }

    foodDB = [...foodDB, ...newFoods];
    saveData();
    populateFoodSelect();
    displayFoodDatabase();
    hideLoading();
  } catch (e) {
    showError('خطا در لود فایل JSON. لطفاً اتصال اینترنت یا آدرس فایل را بررسی کنید.');
    console.error('Error loading JSON:', e);
    hideLoading();
  }
}

window.onload = function() {
  showLoading();
  loadFoodDatabaseFromJSON().then(() => {
    applySettings();
    loadSettings();
    populateFoodSelect();
    displayIntakeHistory();
    displayFoodDatabase();
    updateDashboard();
    hideLoading();
  });
  document.getElementById('foodSearch').addEventListener('input', filterFoodSelect);
};

function applySettings() {
  applyFontSize(userData.fontSize);
}

function loadSettings() {
  if (userData.ibw) {
    document.getElementById('ibw').value = userData.ibw.toFixed(2);
  }
  if (userData.urineOutput) {
    document.getElementById('urineOutput').value = userData.urineOutput.toFixed(2);
  }
  if (userData.minimumUrineOutput) {
    document.getElementById('minimumUrineOutput').value = userData.minimumUrineOutput.toFixed(2);
  }
  document.getElementById('fontSize').value = userData.fontSize || 'large';

  if (userData.ibw) {
    limits = {
      sodium: parseFloat((2300 * (userData.ibw / 70)).toFixed(2)),
      potassium: parseFloat((2500 * (userData.ibw / 70)).toFixed(2)),
      phosphorus: parseFloat((900 * (userData.ibw / 70)).toFixed(2)),
      protein: parseFloat((userData.ibw * 1.2).toFixed(2)),
      water: parseFloat((1000 + (userData.urineOutput || 0) + (userData.ibw * 50)).toFixed(2))
    };
  }

  displayLimits();
}

function showError(message) {
  const errorDiv = document.getElementById('errorMessage');
  errorDiv.textContent = message;
  errorDiv.style.display = 'block';
  setTimeout(() => {
    errorDiv.style.display = 'none';
  }, 5000);
}

function applyFontSize(size) {
  let fontSize;
  switch (size) {
    case 'small': fontSize = '0.9rem'; break;
    case 'medium': fontSize = '1rem'; break;
    case 'large': fontSize = '1.2rem'; break;
    default: fontSize = '1.2rem';
  }
  document.documentElement.style.fontSize = fontSize;
  userData.fontSize = size;
  saveData();
}

function saveData() {
  try {
    userData.intakeHistory = intakeHistory;
    userData.foodDB = foodDB;
    userData.limits = limits;
    userData.ibw = parseFloat(document.getElementById('ibw').value) || null;
    userData.urineOutput = parseFloat(document.getElementById('urineOutput').value) || null;
    userData.minimumUrineOutput = parseFloat(document.getElementById('minimumUrineOutput').value) || 500;
    userData.fontSize = document.getElementById('fontSize').value || 'large';
    localStorage.setItem(storageKey, JSON.stringify(userData));
  } catch (e) {
    showError('خطا در ذخیره‌سازی داده‌ها. لطفاً دوباره تلاش کنید.');
    console.error('Error saving data to localStorage:', e);
  }
}

function saveSettings(event) {
  event.preventDefault();
  const ibw = parseFloat(document.getElementById('ibw').value);
  const urineOutput = parseFloat(document.getElementById('urineOutput').value) || 0;
  const minimumUrineOutput = parseFloat(document.getElementById('minimumUrineOutput').value);

  if (isNaN(ibw) || ibw <= 0) {
    showError('لطفاً وزن ایده‌آل معتبری وارد کنید.');
    return;
  }
  if (isNaN(minimumUrineOutput) || minimumUrineOutput <= 0) {
    showError('لطفاً حداقل مقدار ادرار معتبری وارد کنید.');
    return;
  }

  userData.ibw = ibw;
  userData.urineOutput = urineOutput;
  userData.minimumUrineOutput = minimumUrineOutput;

  limits = {
    sodium: parseFloat((2300 * (ibw / 70)).toFixed(2)),
    potassium: parseFloat((2500 * (ibw / 70)).toFixed(2)),
    phosphorus: parseFloat((900 * (ibw / 70)).toFixed(2)),
    protein: parseFloat((ibw * 1.2).toFixed(2)),
    water: parseFloat((1000 + urineOutput + (ibw * 50)).toFixed(2))
  };

  saveData();
  displayLimits();
  updateDashboard();
  applyFontSize(document.getElementById('fontSize').value);
  showError('تنظیمات با موفقیت ذخیره شد.');
}

function openTab(tabName) {
  document.getElementById('introPage').style.display = 'none';
  document.getElementById('contentArea').style.display = 'block';
  const tabContents = document.getElementsByClassName('tab-content');
  for (let i = 0; i < tabContents.length; i++) {
    tabContents[i].classList.remove('active');
  }
  document.getElementById(tabName).classList.add('active');
  pageHistory.push(tabName);
}

function goBack() {
  if (pageHistory.length > 1) {
    pageHistory.pop();
    const previousPage = pageHistory[pageHistory.length - 1];
    openTab(previousPage);
  } else {
    document.getElementById('introPage').style.display = 'block';
    document.getElementById('contentArea').style.display = 'none';
    const tabContents = document.getElementsByClassName('tab-content');
    for (let i = 0; i < tabContents.length; i++) {
      tabContents[i].classList.remove('active');
    }
    pageHistory = [];
  }
}

function resetAllData() {
  if (confirm('آیا مطمئن هستید که می‌خواهید تمام داده‌ها (شامل تاریخچه، مواد غذایی و تنظیمات) را پاک کنید؟ این عملیات قابل بازگشت نیست.')) {
    intakeHistory = [];
    foodDB = [];
    loadFoodDatabaseFromJSON();
    limits = { sodium: 2300, potassium: 2500, phosphorus: 900, protein: 80, water: 1000 };
    userData = {
      intakeHistory: [],
      foodDB: foodDB,
      limits: limits,
      ibw: null,
      urineOutput: null,
      minimumUrineOutput: 500,
      fontSize: 'large'
    };
    localStorage.setItem(storageKey, JSON.stringify(userData));
    populateFoodSelect();
    displayIntakeHistory();
    displayFoodDatabase();
    displayLimits();
    updateDashboard();
    showError('تمام داده‌ها با موفقیت پاک شدند.');
  }
}

function setupAccordion() {
  const buttons = document.getElementsByClassName('accordion-button');
  for (let i = 0; i < buttons.length; i++) {
    buttons[i].addEventListener('click', function() {
      const content = this.nextElementSibling;
      content.classList.toggle('active');
    });
  }
}

function populateFoodSelect(searchTerm = '') {
  const foodSelect = document.getElementById('foodSelect');
  foodSelect.innerHTML = '<option value="">یک غذا انتخاب کنید</option>';
  foodDB
    .filter(food => searchTerm === '' || food.name.toLowerCase().includes(searchTerm.toLowerCase()))
    .forEach((food, index) => {
      const option = document.createElement('option');
      option.value = index;
      option.textContent = `${food.name} (${food.unit})`;
      foodSelect.appendChild(option);
    });
}

function filterFoodSelect() {
  const searchTerm = document.getElementById('foodSearch').value;
  populateFoodSelect(searchTerm);
}

function addIntake(event) {
  event.preventDefault();
  const foodSelect = document.getElementById('foodSelect');
  const quantityInput = document.getElementById('quantity');
  const mealTypeSelect = document.getElementById('mealType');

  const foodIndex = parseInt(foodSelect.value);
  const quantity = parseFloat(quantityInput.value);
  const mealType = mealTypeSelect.value;

  if (isNaN(foodIndex) || foodIndex < 0 || foodIndex >= foodDB.length) {
    showError('لطفاً یک غذا انتخاب کنید.');
    return;
  }
  if (isNaN(quantity) || quantity <= 0) {
    showError('لطفاً مقدار معتبری وارد کنید.');
    return;
  }
  if (!mealType) {
    showError('لطفاً یک وعده غذایی انتخاب کنید.');
    return;
  }

  const food = foodDB[foodIndex];
  let date;
  try {
    const persianDate = new persianDate();
    date = persianDate.format('dddd D MMMM YYYY');
  } catch (e) {
    console.error('Error with persianDate:', e);
    date = new Date().toLocaleDateString('fa-IR');
  }

  const timestamp = new Date().getTime();

  const intake = {
    type: 'food',
    date: date,
    timestamp: timestamp,
    mealType: mealType,
    food: food.name,
    quantity: quantity,
    unit: food.unit,
    sodium: parseFloat(((food.sodium || 0) * quantity).toFixed(2)),
    potassium: parseFloat(((food.potassium || 0) * quantity).toFixed(2)),
    phosphorus: parseFloat(((food.phosphorus || 0) * quantity).toFixed(2)),
    protein: parseFloat(((food.protein || 0) * quantity).toFixed(2)),
    water: parseFloat(((food.water || 0) * quantity).toFixed(2)),
    urine: 0,
    kcal: parseFloat(((food.kcal || 0) * quantity).toFixed(2))
  };

  intakeHistory.push(intake);
  saveData();
  displayIntakeHistory();
  updateDashboard();

  foodSelect.selectedIndex = 0;
  quantityInput.value = '';
  mealTypeSelect.selectedIndex = 0;
  document.getElementById('foodSearch').value = '';
  populateFoodSelect();
}

function addWaterIntake(event) {
  event.preventDefault();
  const waterCupsInput = document.getElementById('waterCups');
  const cups = parseFloat(waterCupsInput.value);

  if (isNaN(cups) || cups <= 0) {
    showError('لطفاً تعداد لیوان‌ها را به صورت معتبر وارد کنید.');
    return;
  }

  const waterAmount = parseFloat((cups * 200).toFixed(2));

  let date;
  try {
    const persianDate = new persianDate();
    date = persianDate.format('dddd D MMMM YYYY');
  } catch (e) {
    console.error('Error with persianDate:', e);
    date = new Date().toLocaleDateString('fa-IR');
  }

  const timestamp = new Date().getTime();

  const intake = {
    type: 'water',
    date: date,
    timestamp: timestamp,
    mealType: '-',
    food: `آب (${cups} لیوان)`,
    quantity: cups,
    unit: 'لیوان',
    sodium: 0,
    potassium: 0,
    phosphorus: 0,
    protein: 0,
    water: waterAmount,
    urine: 0,
    kcal: 0
  };

  intakeHistory.push(intake);
  saveData();
  displayIntakeHistory();
  updateDashboard();

  waterCupsInput.value = '';
}

function addUrineOutput(event) {
  event.preventDefault();
  const urineAmountInput = document.getElementById('urineAmount');
  const urineAmount = parseFloat(urineAmountInput.value);

  if (isNaN(urineAmount) || urineAmount <= 0) {
    showError('لطفاً مقدار معتبری برای ادرار وارد کنید.');
    return;
  }

  let date;
  try {
    const persianDate = new persianDate();
    date = persianDate.format('dddd D MMMM YYYY');
  } catch (e) {
    console.error('Error with persianDate:', e);
    date = new Date().toLocaleDateString('fa-IR');
  }

  const timestamp = new Date().getTime();

  const intake = {
    type: 'urine',
    date: date,
    timestamp: timestamp,
    mealType: '-',
    food: 'ادرار',
    quantity: parseFloat(urineAmount.toFixed(2)),
    unit: 'میلی‌لیتر',
    sodium: 0,
    potassium: 0,
    phosphorus: 0,
    protein: 0,
    water: 0,
    urine: parseFloat(urineAmount.toFixed(2)),
    kcal: 0
  };

  intakeHistory.push(intake);
  saveData();
  displayIntakeHistory();
  updateDashboard();

  urineAmountInput.value = '';
}

function calculateDailyUrineOutput() {
  const now = new Date().getTime();
  const oneDayInMs = 24 * 60 * 60 * 1000;
  const recentUrine = intakeHistory.filter(item => {
    return item.type === 'urine' && (now - item.timestamp) <= oneDayInMs;
  });
  return parseFloat(recentUrine.reduce((sum, item) => sum + (item.urine || 0), 0).toFixed(2));
}

function displayIntakeHistory() {
  const intakeTableBody = document.getElementById('intakeTableBody');
  intakeTableBody.innerHTML = '';
  intakeHistory.forEach((intake, index) => {
    const table = document.createElement('table');
    table.innerHTML = `
      <thead>
        <tr><th>پارامتر</th><th>مقدار</th></tr>
      </thead>
      <tbody>
        <tr><td>تاریخ</td><td>${intake.date || '-'}</td></tr>
        <tr><td>نوع</td><td>${intake.type === 'food' ? intake.mealType : (intake.type === 'water' ? 'آب' : 'ادرار')}</td></tr>
        <tr><td>غذا/آب/ادرار</td><td>${intake.food || '-'}</td></tr>
        <tr><td>مقدار</td><td>${intake.quantity || 0} ${intake.unit || ''}</td></tr>
        <tr><td>سدیم (میلی‌گرم)</td><td>${(intake.sodium || 0).toFixed(2)}</td></tr>
        <tr><td>پتاسیم (میلی‌گرم)</td><td>${(intake.potassium || 0).toFixed(2)}</td></tr>
        <tr><td>فسفر (میلی‌گرم)</td><td>${(intake.phosphorus || 0).toFixed(2)}</td></tr>
        <tr><td>پروتئین (گرم)</td><td>${(intake.protein || 0).toFixed(2)}</td></tr>
        <tr><td>آب (میلی‌لیتر)</td><td>${(intake.water || 0).toFixed(2)}</td></tr>
        <tr><td>ادرار (میلی‌لیتر)</td><td>${(intake.urine || 0).toFixed(2)}</td></tr>
        <tr><td>کالری (کیلوکالری)</td><td>${(intake.kcal || 0).toFixed(2)}</td></tr>
        <tr><td>عملیات</td><td><button class="delete-button" onclick="deleteIntake(${index})"><i class="fas fa-trash"></i> حذف</button></td></tr>
      </tbody>
    `;
    intakeTableBody.appendChild(table);
  });
}

function deleteIntake(index) {
  intakeHistory.splice(index, 1);
  saveData();
  displayIntakeHistory();
  updateDashboard();
}

function deleteAllIntakes() {
  if (confirm('آیا مطمئن هستید که می‌خواهید همه اطلاعات ثبت‌شده را حذف کنید؟')) {
    intakeHistory = [];
    saveData();
    displayIntakeHistory();
    updateDashboard();
  }
}

function filterFoodDatabase() {
  const filter = document.getElementById('filterSelect').value;
  let filteredFoods = foodDB;
  if (filter === 'lowPotassium') {
    filteredFoods = foodDB.filter(food => food.restrictions && (food.restrictions.potassium === 'low' || !food.restrictions.potassium));
  } else if (filter === 'lowPhosphorus') {
    filteredFoods = foodDB.filter(food => food.restrictions && (food.restrictions.phosphorus === 'low' || !food.restrictions.phosphorus));
  } else if (filter === 'lowSodium') {
    filteredFoods = foodDB.filter(food => food.restrictions && (food.restrictions.sodium === 'low' || !food.restrictions.sodium));
  }
  displayFoodDatabase(filteredFoods);
}

function displayFoodDatabase(foods = foodDB) {
  const foodCategoriesDiv = document.getElementById('foodCategories');
  foodCategoriesDiv.innerHTML = '';
  const categories = [...new Set(foodDB.map(food => food.category))];
  categories.forEach(category => {
    const categoryFoods = foods.filter(food => food.category === category);
    if (categoryFoods.length > 0) {
      const button = document.createElement('button');
      button.className = 'accordion-button';
      button.innerHTML = `<i class="fas fa-chevron-down"></i> ${category}`;
      const content = document.createElement('div');
      content.className = 'accordion-content';
      const tableWrapper = document.createElement('div');
      tableWrapper.className = 'table-wrapper';
      const table = document.createElement('table');
      table.innerHTML = `
        <thead>
          <tr>
            <th>تصویر</th>
            <th>نام</th>
            <th>واحد</th>
            <th>سدیم (میلی‌گرم)</th>
            <th>پتاسیم (میلی‌گرم)</th>
            <th>فسفر (میلی‌گرم)</th>
            <th>پروتئین (گرم)</th>
            <th>آب (میلی‌لیتر)</th>
            <th>کالری (کیلوکالری)</th>
            <th>کربوهیدرات (گرم)</th>
            <th>چربی (گرم)</th>
            <th>تأثیر بر قند خون</th>
            <th>هشدارها</th>
            <th>عملیات</th>
          </tr>
        </thead>
        <tbody>
          ${categoryFoods.map((food, index) => {
            const warnings = [];
            if (food.restrictions) {
              if (food.restrictions.sodium === 'high') warnings.push('سدیم بالا');
              if (food.restrictions.potassium === 'high') warnings.push('پتاسیم بالا');
              if (food.restrictions.phosphorus === 'high') warnings.push('فسفر بالا');
              if (food.restrictions.bloodSugar === 'high') warnings.push('قند خون بالا');
            }
            const warningText = warnings.length > 0 ? `⚠️ ${warnings.join('، ')}` : '';
            return `
              <tr ${warnings.length > 0 ? 'style="background-color: #ffe6e6;"' : ''}>
                <td><img src="${food.image || ''}" class="food-image" ${!food.image ? 'style="display:none;"' : ''}></td>
                <td>${food.name}</td>
                <td>${food.unit || '-'}</td>
                <td>${(food.sodium || 0).toFixed(2)}</td>
                <td>${(food.potassium || 0).toFixed(2)}</td>
                <td>${(food.phosphorus || 0).toFixed(2)}</td>
                <td>${(food.protein || 0).toFixed(2)}</td>
                <td>${(food.water || 0).toFixed(2)}</td>
                <td>${(food.kcal || 0).toFixed(2)}</td>
                <td>${(food.carb || 0).toFixed(2)}</td>
                <td>${(food.fat || 0).toFixed(2)}</td>
                <td>${food.bloodSugarImpact || 'نامشخص'}</td>
                <td>${warningText}</td>
                <td>
                  <button class="edit-button" onclick="editFood(${foodDB.indexOf(food)})"><i class="fas fa-edit"></i> ویرایش</button>
                  <button class="delete-button" onclick="deleteFood(${foodDB.indexOf(food)})"><i class="fas fa-trash"></i> حذف</button>
                </td>
              </tr>
            `;
          }).join('')}
        </tbody>
      `;
      tableWrapper.appendChild(table);
      content.appendChild(tableWrapper);
      foodCategoriesDiv.appendChild(button);
      foodCategoriesDiv.appendChild(content);
    }
  });
  setupAccordion();
}

function showAddFoodForm() {
  const form = document.getElementById('addFoodForm');
  form.style.display = 'block';
  document.getElementById('foodIndex').value = '';
  document.getElementById('foodName').value = '';
  document.getElementById('foodCategory').value = 'گوشت';
  document.getElementById('foodImage').value = '';
  document.getElementById('foodSodium').value = '';
  document.getElementById('foodPotassium').value = '';
  document.getElementById('foodPhosphorus').value = '';
  document.getElementById('foodProtein').value = '';
  document.getElementById('foodWater').value = '';
  document.getElementById('foodKcal').value = '';
  document.getElementById('foodCarb').value = '';
  document.getElementById('foodFat').value = '';
}

function editFood(index) {
  const food = foodDB[index];
  document.getElementById('addFoodForm').style.display = 'block';
  document.getElementById('foodIndex').value = index;
  document.getElementById('foodName').value = food.name;
  document.getElementById('foodCategory').value = food.category;
  document.getElementById('foodSodium').value = food.sodium;
  document.getElementById('foodPotassium').value = food.potassium;
  document.getElementById('foodPhosphorus').value = food.phosphorus;
  document.getElementById('foodProtein').value = food.protein;
  document.getElementById('foodWater').value = food.water;
  document.getElementById('foodKcal').value = food.kcal;
  document.getElementById('foodCarb').value = food.carb;
  document.getElementById('foodFat').value = food.fat;
}

function addFood(event) {
  event.preventDefault();
  const index = document.getElementById('foodIndex').value;
  const sodium = parseFloat(document.getElementById('foodSodium').value);
  const potassium = parseFloat(document.getElementById('foodPotassium').value);
  const phosphorus = parseFloat(document.getElementById('foodPhosphorus').value);
  const protein = parseFloat(document.getElementById('foodProtein').value);
  const water = parseFloat(document.getElementById('foodWater').value);
  const kcal = parseFloat(document.getElementById('foodKcal').value);
  const carb = parseFloat(document.getElementById('foodCarb').value);
  const fat = parseFloat(document.getElementById('foodFat').value);
  const imageInput = document.getElementById('foodImage');
  const image = imageInput.files && imageInput.files[0] ? URL.createObjectURL(imageInput.files[0]) : '';

  if (isNaN(sodium) || isNaN(potassium) || isNaN(phosphorus) || isNaN(protein) || isNaN(water) || isNaN(kcal) || isNaN(carb) || isNaN(fat)) {
    showError('لطفاً تمام مقادیر را به صورت معتبر وارد کنید.');
    return;
  }

  const newFood = {
    name: document.getElementById('foodName').value,
    category: document.getElementById('foodCategory').value,
    sodium: parseFloat(sodium.toFixed(2)),
    potassium: parseFloat(potassium.toFixed(2)),
    phosphorus: parseFloat(phosphorus.toFixed(2)),
    protein: parseFloat(protein.toFixed(2)),
    water: parseFloat(water.toFixed(2)),
    kcal: parseFloat(kcal.toFixed(2)),
    carb: parseFloat(carb.toFixed(2)),
    fat: parseFloat(fat.toFixed(2)),
    bloodSugarImpact: document.getElementById('foodName').value.includes('bloodsugar') ? 'medium' : 'low',
    restrictions: {},
    image: image,
    unit: document.getElementById('foodName').value.includes('نان') ? '۳۰ گرم' :
          document.getElementById('foodName').value.includes('گوشت') ? '۱۰۰ گرم' :
          document.getElementById('foodName').value.includes('میوه') ? 'عدد متوسط' :
          document.getElementById('foodName').value.includes('سبزی') ? 'فنجان' : 'واحد'
  };

  if (index === '') {
    foodDB.push(newFood);
  } else {
    foodDB[index] = newFood;
  }
  saveData();
  displayFoodDatabase();
  populateFoodSelect();
  document.getElementById('addFoodForm').style.display = 'none';
  document.getElementById('addFoodForm').reset();
}

function deleteFood(index) {
  foodDB.splice(index, 1);
  saveData();
  displayFoodDatabase();
  populateFoodSelect();
}

function displayLimits() {
  document.getElementById('sodiumLimitDisplayMg').textContent = limits.sodium.toFixed(2);
  document.getElementById('potassiumLimitDisplayMg').textContent = limits.potassium.toFixed(2);
  document.getElementById('phosphorusLimitDisplayMg').textContent = limits.phosphorus.toFixed(2);
  document.getElementById('proteinLimitDisplayMg').textContent = limits.protein.toFixed(2);
  document.getElementById('waterLimitDisplayMl').textContent = limits.water.toFixed(2);

  document.getElementById('sodiumLimit').value = limits.sodium.toFixed(2);
  document.getElementById('potassiumLimit').value = limits.potassium.toFixed(2);
  document.getElementById('phosphorusLimit').value = limits.phosphorus.toFixed(2);
  document.getElementById('proteinLimit').value = limits.protein.toFixed(2);
  document.getElementById('waterLimit').value = limits.water.toFixed(2);
}

function updateDashboard() {
  const now = new Date().getTime();
  const oneDayInMs = 24 * 60 * 60 * 1000;
  const recentIntakes = intakeHistory.filter(item => {
    return (now - item.timestamp) <= oneDayInMs;
  });

  const totals = recentIntakes.reduce((acc, item) => {
    acc.sodium += item.sodium || 0;
    acc.potassium += item.potassium || 0;
    acc.phosphorus += item.phosphorus || 0;
    acc.protein += item.protein || 0;
    acc.water += item.water || 0;
    acc.kcal += item.kcal || 0;
    return acc;
  }, { sodium: 0, potassium: 0, phosphorus: 0, protein: 0, water: 0, kcal: 0 });

  document.getElementById('totalSodiumMg').textContent = totals.sodium.toFixed(2);
  document.getElementById('totalPotassiumMg').textContent = totals.potassium.toFixed(2);
  document.getElementById('totalPhosphorusMg').textContent = totals.phosphorus.toFixed(2);
  document.getElementById('totalProteinMg').textContent = totals.protein.toFixed(2);
  document.getElementById('totalWaterMl').textContent = totals.water.toFixed(2);
  document.getElementById('totalKcal').textContent = totals.kcal.toFixed(2);

  const dailyUrine = calculateDailyUrineOutput();
  document.getElementById('dailyUrineOutput').textContent = dailyUrine.toFixed(2);

  const warningsDiv = document.getElementById('warnings');
  warningsDiv.innerHTML = '';
  if (dailyUrine < userData.minimumUrineOutput) {
    const warning = document.createElement('div');
    warning.className = 'warning';
    warning.textContent = `⚠️ مقدار ادرار روزانه (${dailyUrine.toFixed(2)} میلی‌لیتر) کمتر از حداقل مجاز (${userData.minimumUrineOutput.toFixed(2)} میلی‌لیتر) است.`;
    warningsDiv.appendChild(warning);
  }

  updateChart('sodiumChart', 'سدیم', totals.sodium, limits.sodium, 'میلی‌گرم');
  updateChart('potassiumChart', 'پتاسیم', totals.potassium, limits.potassium, 'میلی‌گرم');
  updateChart('phosphorusChart', 'فسفر', totals.phosphorus, limits.phosphorus, 'میلی‌گرم');
  updateChart('proteinChart', 'پروتئین', totals.protein, limits.protein, 'گرم');
  updateChart('waterChart', 'آب', totals.water, limits.water, 'میلی‌لیتر');
}

function updateChart(chartId, label, value, limit, unit) {
  const ctx = document.getElementById(chartId).getContext('2d');
  const percentage = Math.min((value / limit) * 100, 100);
  let emoji = '😊';
  if (percentage > 100) {
    emoji = '😟';
  } else if (percentage > 80) {
    emoji = '⚠️';
  }

  if (charts[chartId]) {
    charts[chartId].destroy();
  }

  charts[chartId] = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: [label, 'باقیمانده'],
      datasets: [{
        data: [value, Math.max(limit - value, 0)],
        backgroundColor: ['#42a5f5', '#e0e0e0'],
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: function(context) {
              const val = context.raw.toFixed(2);
              return `${context.label}: ${val} ${unit}`;
            }
          }
        }
      }
    }
  });

  document.getElementById(`${chartId.replace('Chart', 'Sticker')}`).textContent = emoji;
}

function sendSMS() {
  const now = new Date().getTime();
  const oneDayInMs = 24 * 60 * 60 * 1000;
  const recentIntakes = intakeHistory.filter(item => {
    return (now - item.timestamp) <= oneDayInMs;
  });

  const totals = recentIntakes.reduce((acc, item) => {
    acc.sodium += item.sodium || 0;
    acc.potassium += item.potassium || 0;
    acc.phosphorus += item.phosphorus || 0;
    acc.protein += item.protein || 0;
    acc.water += item.water || 0;
    acc.kcal += item.kcal || 0;
    return acc;
  }, { sodium: 0, potassium: 0, phosphorus: 0, protein: 0, water: 0, kcal: 0 });

  const dailyUrine = calculateDailyUrineOutput();

  let message = `گزارش روزانه بیمار (شناسه دستگاه: ${deviceId})\n`;
  message += `سدیم: ${totals.sodium.toFixed(2)} میلی‌گرم (حد مجاز: ${limits.sodium.toFixed(2)})\n`;
  message += `پتاسیم: ${totals.potassium.toFixed(2)} میلی‌گرم (حد مجاز: ${limits.potassium.toFixed(2)})\n`;
  message += `فسفر: ${totals.phosphorus.toFixed(2)} میلی‌گرم (حد مجاز: ${limits.phosphorus.toFixed(2)})\n`;
  message += `پروتئین: ${totals.protein.toFixed(2)} گرم (حد مجاز: ${limits.protein.toFixed(2)})\n`;
  message += `آب: ${totals.water.toFixed(2)} میلی‌لیتر (حد مجاز: ${limits.water.toFixed(2)})\n`;
  message += `کالری: ${totals.kcal.toFixed(2)} کیلوکالری\n`;
  message += `ادرار ۲۴ ساعته: ${dailyUrine.toFixed(2)} میلی‌لیتر\n`;

  const encodedMessage = encodeURIComponent(message);
  const smsUrl = `sms:+989123456789?body=${encodedMessage}`; // شماره تیم درمانی را جایگزین کنید
  window.location.href = smsUrl;
}
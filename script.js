// Structure des données
let groups = JSON.parse(localStorage.getItem('groups')) || [];
let todos = JSON.parse(localStorage.getItem('todos')) || [];
let currentGroup = null;
let selectedGroups = new Set();
let isSidebarOpen = false;

// Fonctions pour les groupes
function addGroup() {
    const groupInput = document.getElementById('groupInput');
    const name = groupInput.value.trim();
    
    if (name === '') return;

    const group = {
        id: Date.now(),
        name: name
    };

    groups.push(group);
    saveGroups();
    groupInput.value = '';
    renderGroups();
    
    // Redirection automatique vers le nouveau groupe
    selectGroup(group.id);
}

function editGroup(id) {
    const group = groups.find(g => g.id === id);
    const newName = prompt('Modifier le nom du groupe:', group.name);
    
    if (newName !== null && newName.trim() !== '') {
        group.name = newName.trim();
        saveGroups();
        renderGroups();
    }
}

function deleteGroup(id) {
    if (!confirm('Voulez-vous vraiment supprimer ce groupe et toutes ses tâches ?')) return;
    
    groups = groups.filter(group => group.id !== id);
    todos = todos.filter(todo => todo.groupId !== id);
    saveGroups();
    saveTodos();
    renderGroups();
}

function selectGroup(id) {
    currentGroup = groups.find(g => g.id === id);
    document.getElementById('groupView').classList.add('hidden');
    document.getElementById('todoView').classList.remove('hidden');
    document.getElementById('currentGroupTitle').textContent = currentGroup.name;
    renderTodos();
    setupAutocomplete();
}

function backToGroups() {
    currentGroup = null;
    document.getElementById('groupView').classList.remove('hidden');
    document.getElementById('todoView').classList.add('hidden');
}

// Fonctions pour les todos
function parseNaturalInput(input) {
    // Expressions régulières pour les différents formats
    const patterns = [
        // Format: nombre unité texte ou texte nombre unité
        /^(\d+)\s*(ml|cl|l|g|kg|cs|cc)\s+(.+)$/i,
        /^(.+)\s+(\d+)\s*(ml|cl|l|g|kg|cs|cc)$/i,
        // Format: nombre texte ou texte nombre
        /^(\d+)\s+(.+)$/,
        /^(.+)\s+(\d+)$/,
        // Format: texte seul
        /^(.+)$/
    ];

    for (let pattern of patterns) {
        const match = input.trim().match(pattern);
        if (match) {
            // Pour les formats avec unités
            if (match[2] && (typeof match[2] === 'string' && match[2].match(/^(ml|cl|l|g|kg|cs|cc)$/i))) {
                return {
                    text: capitalizeFirstLetter(match[3] || match[1]),
                    value: parseFloat(match[1] || match[2]),
                    unit: match[2].toLowerCase()
                };
            }
            // Pour les formats sans unité
            if (match[1] && match[2]) {
                return {
                    text: capitalizeFirstLetter(match[2] || match[1]),
                    value: parseFloat(match[1]),
                    unit: null
                };
            }
            // Pour le texte seul
            return {
                text: capitalizeFirstLetter(match[1]),
                value: null,
                unit: null
            };
        }
    }

    return {
        text: capitalizeFirstLetter(input),
        value: null,
        unit: null
    };
}

function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1).toLowerCase();
}

function addTodo() {
    const todoInput = document.getElementById('todoInput');
    if (todoInput.value.trim() === '') return;

    const parsed = parseNaturalInput(todoInput.value);
    parsed.text = capitalizeFirstLetter(parsed.text);

    const existingTodo = todos.find(t => 
        t.groupId === currentGroup.id && 
        t.text.toLowerCase() === parsed.text.toLowerCase()
    );

    if (existingTodo) {
        if (parsed.value !== null) {
            if (parsed.unit === existingTodo.unit) {
                existingTodo.value = (existingTodo.value || 0) + parsed.value;
            } else if (!existingTodo.value) {
                existingTodo.value = parsed.value;
                existingTodo.unit = parsed.unit;
            }
        }
    } else {
        const todo = {
            id: Date.now(),
            text: parsed.text,
            groupId: currentGroup.id,
            value: parsed.value,
            unit: parsed.unit
        };
        todos.push(todo);
    }

    saveTodos();
    renderTodos();
    todoInput.value = '';
}

function editTodo(id) {
    const todo = todos.find(t => t.id === id);
    const currentValue = todo.value ? `${todo.value} ${todo.text}` : todo.text;
    const newValue = prompt('Modifier l\'item:', currentValue);
    
    if (newValue !== null && newValue.trim() !== '') {
        const parsed = parseNaturalInput(newValue);
        todo.text = parsed.text;
        todo.value = parsed.value;
        saveTodos();
        renderTodos();
        if (isSidebarOpen) {
            renderCombinedTodos();
        }
    }
}

function deleteTodo(id) {
    todos = todos.filter(todo => todo.id !== id);
    saveTodos();
    renderTodos();
}

function toggleTodo(id) {
    const todo = todos.find(t => t.id === id);
    todo.completed = !todo.completed;
    
    // Mettre à jour la valeur quand on coche/décoche
    if (todo.completed) {
        todo.value++;
    } else {
        todo.value = Math.max(1, todo.value - 1);
    }
    
    saveTodos();
    renderTodos();
    // Mettre à jour la sidebar si elle est ouverte
    if (isSidebarOpen) {
        renderCombinedTodos();
    }
}

function toggleSelectGroup(id, event) {
    event.stopPropagation();
    
    if (selectedGroups.has(id)) {
        selectedGroups.delete(id);
    } else {
        selectedGroups.add(id);
    }
    renderGroups();
    
    if (selectedGroups.size > 0) {
        showSidebar();
    } else {
        hideSidebar();
    }
}

function showSidebar() {
    const sidebar = document.getElementById('sidebar');
    sidebar.classList.remove('translate-x-full');
    isSidebarOpen = true;
    renderCombinedTodos();
}

function hideSidebar() {
    const sidebar = document.getElementById('sidebar');
    sidebar.classList.add('translate-x-full');
    isSidebarOpen = false;
}

function renderCombinedTodos() {
    const sidebarContent = document.getElementById('sidebarContent');
    sidebarContent.innerHTML = '';

    const selectedTodos = todos.filter(todo => selectedGroups.has(todo.groupId));
    
    const uniqueTodos = new Map();
    selectedTodos.forEach(todo => {
        const key = `${todo.text.toLowerCase()}_${todo.unit || 'nounit'}`;
        if (!uniqueTodos.has(key)) {
            uniqueTodos.set(key, {
                id: Date.now() + Math.random(),
                text: todo.text,
                values: todo.value ? [todo.value] : [],
                unit: todo.unit,
                completed: false
            });
        } else {
            const existingTodo = uniqueTodos.get(key);
            if (todo.value !== null) {
                existingTodo.values.push(todo.value);
            }
        }
    });

    const savedGlobalTodos = JSON.parse(localStorage.getItem('globalTodos') || '[]');
    
    Array.from(uniqueTodos.values()).forEach(todo => {
        const savedTodo = savedGlobalTodos.find(t => t.text === todo.text);
        if (savedTodo) {
            todo.completed = savedTodo.completed;
        }
    });

    // Calculer la progression
    const totalTodos = uniqueTodos.size;
    const completedTodos = Array.from(uniqueTodos.values()).filter(todo => todo.completed).length;
    const progressPercentage = totalTodos > 0 ? (completedTodos / totalTodos) * 100 : 0;

    // Afficher la barre de progression
    const progressBar = document.createElement('div');
    progressBar.className = 'mb-6';
    progressBar.innerHTML = `
        <div class="flex justify-end items-center mb-2">
            <span class="text-sm font-medium text-blue-600">${completedTodos}/${totalTodos}</span>
        </div>
        <div class="w-full bg-gray-200 rounded-full h-2.5">
            <div class="bg-blue-600 h-2.5 rounded-full transition-all duration-300" style="width: ${progressPercentage}%"></div>
        </div>
    `;
    sidebarContent.appendChild(progressBar);

    // Afficher les todos
    Array.from(uniqueTodos.values()).forEach(todo => {
        const todoElement = document.createElement('div');
        todoElement.className = `flex items-center justify-between p-2 border rounded-md mb-2 ${todo.completed ? 'bg-gray-50' : ''}`;
        
        const totalValue = todo.values.length > 0 ? todo.values.reduce((a, b) => a + b, 0) : null;
        
        todoElement.innerHTML = `
            <div class="flex items-center gap-4">
                <input type="checkbox" ${todo.completed ? 'checked' : ''} 
                    onclick="toggleGlobalTodo('${todo.id}', '${todo.text}')" 
                    class="w-4 h-4 rounded-full border-gray-300 text-blue-600 focus:ring-blue-500">
                <div class="flex items-center gap-2">
                    <span class="${todo.completed ? 'line-through text-gray-500' : ''}">${todo.text}</span>
                    ${totalValue !== null ? `
                        <span class="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded-full">
                            ${totalValue}${todo.unit ? ' ' + todo.unit : ''}
                        </span>
                    ` : ''}
                </div>
            </div>
        `;
        
        sidebarContent.appendChild(todoElement);
    });

    localStorage.setItem('globalTodos', JSON.stringify(Array.from(uniqueTodos.values())));
}

function toggleGlobalTodo(id, text) {
    const globalTodos = JSON.parse(localStorage.getItem('globalTodos') || '[]');
    const todo = globalTodos.find(t => t.text === text);
    if (todo) {
        todo.completed = !todo.completed;
    } else {
        globalTodos.push({
            id: id,
            text: text,
            completed: true
        });
    }
    localStorage.setItem('globalTodos', JSON.stringify(globalTodos));
    renderCombinedTodos();
}

function renderGroups() {
    const groupList = document.getElementById('groupList');
    groupList.innerHTML = '';

    groups.forEach(group => {
        const todoCount = todos.filter(todo => todo.groupId === group.id).length;
        const groupElement = document.createElement('div');
        groupElement.className = `bg-white p-4 rounded-lg shadow-md ${selectedGroups.has(group.id) ? 'border-2 border-blue-500' : ''}`;
        
        groupElement.innerHTML = `
            <div class="flex items-center justify-between">
                <div class="flex items-center gap-4">
                    <input type="checkbox" 
                        ${selectedGroups.has(group.id) ? 'checked' : ''} 
                        onclick="toggleSelectGroup(${group.id}, event)"
                        class="w-4 h-4 border-gray-300 text-blue-600 focus:ring-blue-500">
                    <h3 class="text-lg font-semibold text-gray-700">${group.name}</h3>
                    <span class="text-sm text-gray-500">${todoCount} tâches</span>
                </div>
                <div class="flex gap-2">
                    <button onclick="selectGroup(${group.id})" 
                        class="text-blue-500 hover:text-blue-700 px-3 py-1 rounded-md border border-blue-500">
                        Ouvrir
                    </button>
                    <button onclick="editGroup(${group.id})" 
                        class="text-blue-500 hover:text-blue-700">
                        ✏️
                    </button>
                    <button onclick="deleteGroup(${group.id})" 
                        class="text-red-500 hover:text-red-700">
                        🗑️
                    </button>
                </div>
            </div>
        `;
        
        groupList.appendChild(groupElement);
    });
}

function renderTodos() {
    const todoList = document.getElementById('todoList');
    todoList.innerHTML = '';

    const groupedTodos = todos
        .filter(todo => todo.groupId === currentGroup.id)
        .reduce((acc, todo) => {
            const key = `${todo.text.toLowerCase()}_${todo.unit || 'nounit'}`;
            if (!acc[key]) {
                acc[key] = { ...todo };
            } else if (todo.value !== null) {
                acc[key].value = (acc[key].value || 0) + todo.value;
            }
            return acc;
        }, {});

    Object.values(groupedTodos).forEach(todo => {
        const todoElement = document.createElement('div');
        todoElement.className = 'flex items-center justify-between p-2 border rounded-md';
        
        todoElement.innerHTML = `
            <div class="flex items-center gap-2">
                <span>${todo.text}</span>
                ${todo.value ? `
                    <span class="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded-full">
                        ${todo.value}${todo.unit ? ' ' + todo.unit : ''}
                    </span>
                ` : ''}
            </div>
            <div class="flex gap-2">
                <button onclick="editTodo(${todo.id})" 
                    class="text-blue-500 hover:text-blue-700">
                    ✏️
                </button>
                <button onclick="deleteTodo(${todo.id})" 
                    class="text-red-500 hover:text-red-700">
                    🗑️
                </button>
            </div>
        `;
        
        todoList.appendChild(todoElement);
    });
}

// Fonctions de sauvegarde
function saveGroups() {
    localStorage.setItem('groups', JSON.stringify(groups));
}

function saveTodos() {
    localStorage.setItem('todos', JSON.stringify(todos));
}

// Initialisation
renderGroups(); 

function getExistingItems() {
    // Récupérer tous les noms d'items uniques et les capitaliser
    const uniqueItems = new Set(
        todos.map(todo => todo.text.toLowerCase())
    );
    return Array.from(uniqueItems);
}

function setupAutocomplete() {
    const input = document.getElementById('todoInput');
    const autocompleteList = document.getElementById('autocompleteList');
    let selectedIndex = -1;
    
    input.addEventListener('input', function(e) {
        const inputValue = e.target.value.toLowerCase();
        selectedIndex = -1;

        // Gestion de l'autocomplétion des unités
        const unitMatch = inputValue.match(/^(\d+)(c|k|m|l|g|cs|cc)$/i);
        if (unitMatch) {
            const number = unitMatch[1];
            const partialUnit = unitMatch[2].toLowerCase();
            
            const unitSuggestions = ['ml', 'cl', 'l', 'g', 'kg', 'cs', 'cc']
                .filter(unit => unit.startsWith(partialUnit));

            if (unitSuggestions.length > 0) {
                autocompleteList.innerHTML = unitSuggestions
                    .map((unit, index) => `
                        <div class="p-2 hover:bg-gray-100 cursor-pointer text-gray-700" 
                             data-index="${index}"
                             onclick="selectAutocomplete('${number}${unit}')">
                            ${number}${unit}
                        </div>
                    `).join('');
                autocompleteList.classList.remove('hidden');
                return;
            }
        }

        // Gestion de l'autocomplétion des items avec unités
        const textWithUnitMatch = inputValue.match(/^(\d+\s*(ml|cl|l|g|kg|cs|cc)\s+)?(.+?)(\s+\d+\s*(ml|cl|l|g|kg|cs|cc)?)?$/i);
        if (!textWithUnitMatch) {
            autocompleteList.innerHTML = '';
            autocompleteList.classList.add('hidden');
            return;
        }

        const prefix = textWithUnitMatch[1] || ''; // Nombre et unité au début
        const searchText = textWithUnitMatch[3]; // Texte
        const suffix = textWithUnitMatch[4] || ''; // Nombre et unité à la fin
        
        if (!searchText) {
            autocompleteList.innerHTML = '';
            autocompleteList.classList.add('hidden');
            return;
        }

        const existingItems = getExistingItems();
        const matches = existingItems.filter(item => 
            item.toLowerCase().includes(searchText) && 
            item.toLowerCase() !== searchText
        );

        if (matches.length > 0) {
            autocompleteList.innerHTML = matches
                .slice(0, 5)
                .map((item, index) => `
                    <div class="p-2 hover:bg-gray-100 cursor-pointer text-gray-700" 
                         data-index="${index}"
                         data-prefix="${prefix}"
                         data-suffix="${suffix}"
                         onclick="selectAutocomplete('${capitalizeFirstLetter(item)}', '${prefix}', '${suffix}')">
                        ${prefix}${capitalizeFirstLetter(item)}${suffix}
                    </div>
                `).join('');
            autocompleteList.classList.remove('hidden');
        } else {
            autocompleteList.innerHTML = '';
            autocompleteList.classList.add('hidden');
        }
    });

    input.addEventListener('keydown', function(e) {
        const suggestions = autocompleteList.children;
        const maxIndex = suggestions.length - 1;

        if (suggestions.length === 0) return;

        if (selectedIndex >= 0) {
            suggestions[selectedIndex].classList.remove('bg-gray-100');
        }

        switch(e.key) {
            case 'ArrowDown':
                e.preventDefault();
                selectedIndex = selectedIndex < maxIndex ? selectedIndex + 1 : 0;
                break;
            case 'ArrowUp':
                e.preventDefault();
                selectedIndex = selectedIndex > 0 ? selectedIndex - 1 : maxIndex;
                break;
            case 'Enter':
                e.preventDefault();
                if (selectedIndex >= 0) {
                    const selectedElement = suggestions[selectedIndex];
                    const selectedValue = selectedElement.textContent.trim();
                    const prefix = selectedElement.dataset.prefix || '';
                    const suffix = selectedElement.dataset.suffix || '';
                    if (selectedValue.match(/^\d+[a-z]+$/i)) {
                        // Si c'est une suggestion d'unité
                        selectAutocomplete(selectedValue);
                    } else {
                        // Si c'est une suggestion d'item
                        selectAutocomplete(selectedValue.replace(prefix, '').replace(suffix, ''), prefix, suffix);
                    }
                }
                return;
        }

        if (selectedIndex >= 0) {
            suggestions[selectedIndex].classList.add('bg-gray-100');
            suggestions[selectedIndex].scrollIntoView({ block: 'nearest' });
        }
    });

    document.addEventListener('click', function(e) {
        if (!input.contains(e.target) && !autocompleteList.contains(e.target)) {
            autocompleteList.classList.add('hidden');
        }
    });
}

function selectAutocomplete(value, prefix = '', suffix = '') {
    const input = document.getElementById('todoInput');
    if (value.match(/^\d+[a-z]+$/i)) {
        // Si c'est une unité complétée
        input.value = value + ' ';
    } else {
        // Si c'est un item complété
        input.value = `${prefix}${value}${suffix}`.trim();
    }
    document.getElementById('autocompleteList').classList.add('hidden');
    input.focus();
}
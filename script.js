// Structure des données
let groups = JSON.parse(localStorage.getItem('groups')) || [];
let todos = JSON.parse(localStorage.getItem('todos')) || [];
let currentGroup = null;
let selectedGroups = new Set();
let isSidebarOpen = false;

// Fonctions pour les groupes
function addGroup() {
    const groupInput = document.getElementById('groupInput');
    if (groupInput.value.trim() === '') return;

    const group = {
        id: Date.now(),
        name: groupInput.value.trim()
    };

    groups.push(group);
    saveGroups();
    renderGroups();
    groupInput.value = '';
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
    // Regex pour matcher un nombre suivi d'un texte
    const numberFirstRegex = /^(\d+)\s+(.+)$/;
    // Regex pour matcher un texte suivi d'un nombre
    const textFirstRegex = /^(.+)\s+(\d+)$/;

    let match = input.match(numberFirstRegex) || input.match(textFirstRegex);
    
    if (match) {
        const [_, part1, part2] = match;
        const number = parseInt(numberFirstRegex.test(input) ? part1 : part2);
        const text = numberFirstRegex.test(input) ? part2 : part1;
        
        return {
            text: text.trim(),
            value: number
        };
    }
    
    return {
        text: input.trim(),
        value: null
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

    // Vérifier si un item avec le même nom existe déjà dans le groupe
    const existingTodo = todos.find(t => 
        t.groupId === currentGroup.id && 
        t.text.toLowerCase() === parsed.text.toLowerCase()
    );

    if (existingTodo) {
        // Fusionner les valeurs si elles existent
        if (parsed.value !== null && existingTodo.value !== null) {
            existingTodo.value += parsed.value;
        } else if (parsed.value !== null) {
            existingTodo.value = parsed.value;
        }
    } else {
        // Créer un nouveau todo
        const todo = {
            id: Date.now(),
            text: parsed.text,
            groupId: currentGroup.id,
            value: parsed.value
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
        const key = todo.text.toLowerCase();
        if (!uniqueTodos.has(key)) {
            uniqueTodos.set(key, {
                id: Date.now() + Math.random(),
                text: todo.text,
                values: todo.value ? [todo.value] : [],
                completed: false
            });
        } else {
            const existingTodo = uniqueTodos.get(key);
            if (todo.value !== null) {
                existingTodo.values.push(todo.value);
            }
        }
    });

    // Récupérer l'état sauvegardé des todos
    const savedGlobalTodos = JSON.parse(localStorage.getItem('globalTodos') || '[]');
    
    // Mettre à jour l'état completed avec les données sauvegardées
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
                            ${totalValue}
                        </span>
                    ` : ''}
                </div>
            </div>
        `;
        
        sidebarContent.appendChild(todoElement);
    });

    // Sauvegarder l'état actuel des todos globales
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

    // Grouper les todos par nom pour le rendu
    const groupedTodos = todos
        .filter(todo => todo.groupId === currentGroup.id)
        .reduce((acc, todo) => {
            const key = todo.text.toLowerCase();
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
                        ${todo.value}
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
        
        if (!inputValue || /^\d+\s+/.test(inputValue) || /\s+\d+$/.test(inputValue)) {
            autocompleteList.innerHTML = '';
            autocompleteList.classList.add('hidden');
            return;
        }

        const existingItems = getExistingItems();
        const matches = existingItems.filter(item => 
            item.includes(inputValue) && item !== inputValue
        );

        if (matches.length > 0) {
            autocompleteList.innerHTML = matches
                .slice(0, 5)
                .map((item, index) => `
                    <div class="p-2 hover:bg-gray-100 cursor-pointer text-gray-700" 
                         data-index="${index}"
                         onclick="selectAutocomplete('${capitalizeFirstLetter(item)}')">
                        ${capitalizeFirstLetter(item)}
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

        // Enlever la classe selected précédente
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
                    const selectedValue = suggestions[selectedIndex].textContent.trim();
                    selectAutocomplete(selectedValue);
                }
                return;
        }

        // Ajouter la classe selected à la nouvelle sélection
        if (selectedIndex >= 0) {
            suggestions[selectedIndex].classList.add('bg-gray-100');
            suggestions[selectedIndex].scrollIntoView({ block: 'nearest' });
        }
    });

    // Cacher la liste quand on clique ailleurs
    document.addEventListener('click', function(e) {
        if (!input.contains(e.target) && !autocompleteList.contains(e.target)) {
            autocompleteList.classList.add('hidden');
        }
    });
}

function selectAutocomplete(value) {
    const input = document.getElementById('todoInput');
    input.value = value;
    document.getElementById('autocompleteList').classList.add('hidden');
    input.focus();
}
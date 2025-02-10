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
        name: capitalizeFirstLetter(name)
    };

    groups.push(group);
    saveGroups();
    groupInput.value = '';
    renderGroups();
    
    // Fermer le clavier sur mobile
    groupInput.blur();
}

function editGroup(id) {
    const group = groups.find(g => g.id === id);
    const newName = prompt('Modifier le nom du groupe:', group.name);
    
    if (newName !== null && newName.trim() !== '') {
        group.name = capitalizeFirstLetter(newName.trim());
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
    
    // Cacher la bottom sheet quand on entre dans un groupe
    hideSidebar();
    
    // Focus automatique sur l'input avec un léger délai
    setTimeout(() => {
        const todoInput = document.getElementById('todoInput');
        todoInput.focus();
    }, 100);
    
    setupAutocomplete();
    renderTodos();
}

function backToGroups() {
    document.getElementById('todoView').classList.add('hidden');
    document.getElementById('groupView').classList.remove('hidden');
    currentGroup = null;
    
    // Focus sur l'input de groupe avec un léger délai
    setTimeout(() => {
        const groupInput = document.getElementById('groupInput');
        groupInput.focus();
    }, 100);
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
    // Fermer le clavier sur mobile
    todoInput.blur();
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

function toggleGroupSelection(groupId) {
    if (selectedGroups.has(groupId)) {
        selectedGroups.delete(groupId);
    } else {
        selectedGroups.add(groupId);
    }
    
    renderGroups();
    updateSidebarVisibility();
}

function updateSidebarVisibility() {
    if (selectedGroups.size > 0) {
        showSidebar();
    } else {
        hideSidebar();
    }
}

function showSidebar() {
    const sidebar = document.getElementById('sidebar');
    if (window.innerWidth < 768) {
        sidebar.classList.remove('translate-y-full');
        sidebar.classList.add('peek');
        setupBottomSheet();
    } else {
        sidebar.classList.remove('translate-x-full');
    }
    isSidebarOpen = true;
    renderCombinedTodos();
}

function hideSidebar() {
    const sidebar = document.getElementById('sidebar');
    if (window.innerWidth < 768) {
        sidebar.classList.add('translate-y-full');
        sidebar.classList.remove('peek');
        sidebar.style.height = 'auto'; // Réinitialiser la hauteur
    } else {
        sidebar.classList.add('translate-x-full');
    }
    isSidebarOpen = false;
}

function setupBottomSheet() {
    const sheet = document.getElementById('sidebar');
    const content = sheet.querySelector('.bottom-sheet-content');
    let startY;
    let startHeight;
    const initialHeight = 120; // Hauteur pour voir titre + progression
    const minHeight = 120; // Même hauteur minimale
    const maxHeight = window.innerHeight * 0.85;
    let isExpanded = false;

    // Définir la hauteur initiale
    sheet.style.height = `${initialHeight}px`;

    function expand() {
        sheet.style.transition = 'height 0.3s ease-out';
        sheet.style.height = `${maxHeight}px`;
        content.style.overflowY = 'auto';
        isExpanded = true;
    }

    function collapse() {
        sheet.style.transition = 'height 0.3s ease-out';
        sheet.style.height = `${initialHeight}px`;
        content.style.overflowY = 'hidden';
        isExpanded = false;
    }

    // Gérer le touch/drag
    let isDragging = false;
    let startTouch;

    function onStart(e) {
        isDragging = true;
        startY = e.touches ? e.touches[0].clientY : e.clientY;
        startTouch = startY;
        startHeight = sheet.getBoundingClientRect().height;
        sheet.style.transition = 'none';
    }

    function onMove(e) {
        if (!isDragging) return;
        const currentY = e.touches ? e.touches[0].clientY : e.clientY;
        const deltaY = startY - currentY;
        const newHeight = Math.min(maxHeight, Math.max(minHeight, startHeight + deltaY));
        sheet.style.height = `${newHeight}px`;
        
        if (newHeight > minHeight) {
            content.style.overflowY = 'auto';
            isExpanded = true;
        } else {
            content.style.overflowY = 'hidden';
            isExpanded = false;
        }
    }

    function onEnd(e) {
        if (!isDragging) return;
        isDragging = false;
        sheet.style.transition = 'height 0.3s ease-out';

        const endY = e.changedTouches ? e.changedTouches[0].clientY : e.clientY;
        const totalDelta = startTouch - endY;

        // Détecter la direction du swipe
        if (Math.abs(totalDelta) > 50) { // Seuil minimum pour le swipe
            if (totalDelta > 0) {
                // Swipe vers le haut
                expand();
            } else {
                // Swipe vers le bas
                collapse();
            }
        } else {
            // Si le mouvement est trop petit, revenir à l'état le plus proche
            const currentHeight = sheet.getBoundingClientRect().height;
            if (currentHeight > (minHeight + maxHeight) / 2) {
                expand();
            } else {
                collapse();
            }
        }
    }

    // Gérer les événements tactiles sur le header
    const handle = sheet.querySelector('.bottom-sheet-header');
    handle.addEventListener('touchstart', onStart, { passive: true });
    handle.addEventListener('touchmove', onMove, { passive: true });
    handle.addEventListener('touchend', onEnd);

    // Permettre le scroll dans le contenu une fois étendu
    content.addEventListener('touchstart', function(e) {
        if (!isDragging && isExpanded) {
            e.stopPropagation();
        }
    }, { passive: true });

    // Empêcher la propagation du scroll vers le body
    content.addEventListener('scroll', function(e) {
        e.stopPropagation();
    }, { passive: true });
}

function renderCombinedTodos() {
    const sidebarContent = document.getElementById('sidebarContent');
    sidebarContent.innerHTML = '';

    const selectedTodos = todos.filter(todo => selectedGroups.has(todo.groupId));
    
    // Fusion des todos identiques
    const uniqueTodos = new Map();
    selectedTodos.forEach(todo => {
        const key = todo.text.toLowerCase();
        if (!uniqueTodos.has(key)) {
            uniqueTodos.set(key, {
                id: Date.now() + Math.random(),
                text: todo.text,
                values: todo.value ? [{ value: todo.value, unit: todo.unit }] : [],
                completed: false
            });
        } else {
            const existingTodo = uniqueTodos.get(key);
            if (todo.value !== null) {
                existingTodo.values.push({ value: todo.value, unit: todo.unit });
            }
        }
    });

    const savedGlobalTodos = JSON.parse(localStorage.getItem('globalTodos') || '[]');
    
    Array.from(uniqueTodos.values()).forEach(todo => {
        const savedTodo = savedGlobalTodos.find(t => t.text.toLowerCase() === todo.text.toLowerCase());
        if (savedTodo) {
            todo.completed = savedTodo.completed;
        }
    });

    // Calcul de la progression
    const totalTodos = uniqueTodos.size;
    const completedTodos = Array.from(uniqueTodos.values()).filter(todo => todo.completed).length;

    // Ajout de la barre de progression simplifiée
    const progressBar = document.createElement('div');
    progressBar.className = 'mb-4';
    progressBar.innerHTML = `
        <div class="h-1.5 bg-gray-200 rounded-full overflow-hidden">
            <div class="h-full bg-blue-500 transition-all duration-300" 
                style="width: ${(completedTodos / totalTodos) * 100}%">
            </div>
        </div>
        <div class="mt-1 text-sm text-gray-500 text-center">
            ${completedTodos}/${totalTodos}
        </div>
    `;
    sidebarContent.appendChild(progressBar);

    // Rendu des todos
    Array.from(uniqueTodos.values()).forEach(todo => {
        const todoElement = document.createElement('div');
        todoElement.className = `flex items-center p-2 border rounded-md mb-2 cursor-pointer transition-colors
            ${todo.completed ? 'bg-gray-50' : 'hover:bg-gray-50'}`;
        
        // Regrouper les valeurs par unité
        const valuesByUnit = todo.values.reduce((acc, { value, unit }) => {
            const key = unit || '';
            if (!acc[key]) acc[key] = 0;
            acc[key] += value;
            return acc;
        }, {});
        
        todoElement.innerHTML = `
            <div class="flex items-center gap-4 w-full">
                <input type="checkbox" ${todo.completed ? 'checked' : ''} 
                    class="w-4 h-4 rounded-full border-gray-300 text-blue-600 focus:ring-blue-500">
                <div class="flex items-center gap-2 flex-1">
                    <span class="${todo.completed ? 'line-through text-gray-500' : ''}">${todo.text}</span>
                    <div class="flex gap-1">
                        ${Object.entries(valuesByUnit).map(([unit, total]) => `
                            <span class="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded-full">
                                ${total}${unit ? ' ' + unit : ''}
                            </span>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;
        
        // Gérer le clic sur toute la ligne
        todoElement.addEventListener('click', (e) => {
            if (e.target.type !== 'checkbox') {
                const checkbox = todoElement.querySelector('input[type="checkbox"]');
                checkbox.checked = !checkbox.checked;
            }
            toggleGlobalTodo(todo.id, todo.text);
        });
        
        sidebarContent.appendChild(todoElement);
    });

    localStorage.setItem('globalTodos', JSON.stringify(Array.from(uniqueTodos.values())));
}

function toggleGlobalTodo(id, text) {
    const savedGlobalTodos = JSON.parse(localStorage.getItem('globalTodos') || '[]');
    const existingTodo = savedGlobalTodos.find(t => t.text.toLowerCase() === text.toLowerCase());
    
    if (existingTodo) {
        existingTodo.completed = !existingTodo.completed;
    } else {
        savedGlobalTodos.push({
            id: id,
            text: text,
            completed: true
        });
    }
    
    localStorage.setItem('globalTodos', JSON.stringify(savedGlobalTodos));
    renderCombinedTodos();
}

function renderGroups() {
    const groupList = document.getElementById('groupList');
    groupList.innerHTML = '';

    if (groups.length === 0) {
        const emptyState = document.createElement('div');
        emptyState.className = 'flex flex-col items-center justify-center p-8 text-center text-gray-500';
        emptyState.innerHTML = `
            <svg class="w-16 h-16 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                    d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z">
                </path>
            </svg>
            <p class="text-lg font-medium">Aucun groupe</p>
            <p class="mt-1">Créez votre premier groupe en utilisant le champ ci-dessous</p>
        `;
        groupList.appendChild(emptyState);
        return;
    }

    groups.forEach(group => {
        const itemCount = todos.filter(todo => todo.groupId === group.id).length;
        
        const groupElement = document.createElement('div');
        groupElement.className = `p-4 bg-white rounded-lg shadow-sm hover:bg-gray-50 transition-colors cursor-pointer
            ${selectedGroups.has(group.id) ? 'ring-2 ring-blue-500' : ''}`;
        
        groupElement.innerHTML = `
            <div class="flex items-center justify-between">
                <div class="flex items-center gap-4 flex-1">
                    <input type="checkbox" 
                        ${selectedGroups.has(group.id) ? 'checked' : ''}
                        class="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500">
                    <div class="flex items-center gap-2">
                        <span class="text-gray-800">${group.name}</span>
                        ${itemCount > 0 ? `
                            <span class="text-sm px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">
                                ${itemCount}
                            </span>
                        ` : ''}
                    </div>
                </div>
                <div class="relative">
                    <button class="p-1 hover:bg-gray-100 rounded-full group-menu-trigger">
                        <svg class="w-5 h-5 text-gray-500" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 14a2 2 0 100-4 2 2 0 000 4zM12 21a2 2 0 100-4 2 2 0 000 4zM12 7a2 2 0 100-4 2 2 0 000 4z"/>
                        </svg>
                    </button>
                    <div class="hidden absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-10 group-menu">
                        <button onclick="editGroup(${group.id})" 
                            class="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                            Renommer
                        </button>
                        <button onclick="deleteGroup(${group.id})" 
                            class="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100">
                            Supprimer
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        // Gestion des événements
        const checkbox = groupElement.querySelector('input[type="checkbox"]');
        const menuTrigger = groupElement.querySelector('.group-menu-trigger');
        const menu = groupElement.querySelector('.group-menu');
        
        // Empêcher la propagation du clic sur la checkbox
        checkbox.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleGroupSelection(group.id);
        });
        
        // Gestion du menu
        menuTrigger.addEventListener('click', (e) => {
            e.stopPropagation();
            menu.classList.toggle('hidden');
        });
        
        // Fermer le menu au clic ailleurs
        document.addEventListener('click', (e) => {
            if (!menuTrigger.contains(e.target)) {
                menu.classList.add('hidden');
            }
        });
        
        // Empêcher la propagation des clics du menu
        menu.addEventListener('click', (e) => {
            e.stopPropagation();
        });
        
        // Clic sur la carte pour ouvrir le groupe
        groupElement.addEventListener('click', (e) => {
            if (!e.target.matches('input[type="checkbox"], button, .group-menu *, .group-menu-trigger *')) {
                selectGroup(group.id);
            }
        });
        
        groupList.appendChild(groupElement);
    });

    updateSidebarVisibility();
}

function renderTodos() {
    const todoList = document.getElementById('todoList');
    todoList.innerHTML = '';

    const currentTodos = todos.filter(todo => todo.groupId === currentGroup.id);

    if (currentTodos.length === 0) {
        // Empty state pour les todos
        const emptyState = document.createElement('div');
        emptyState.className = 'flex flex-col items-center justify-center p-8 text-center text-gray-500';
        emptyState.innerHTML = `
            <svg class="w-16 h-16 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4">
                </path>
            </svg>
            <p class="text-lg font-medium">Liste vide</p>
            <p class="mt-1">Ajoutez votre premier élément en utilisant le champ ci-dessous</p>
        `;
        todoList.appendChild(emptyState);
        return;
    }

    const groupedTodos = currentTodos
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

        // Extraction du texte à rechercher en ignorant les nombres et unités
        const searchText = inputValue.replace(/^\d+\s*(ml|cl|l|g|kg|cs|cc)?\s+/i, '')  // Ignore au début
                                   .replace(/\s+\d+\s*(ml|cl|l|g|kg|cs|cc)?$/i, '');    // Ignore à la fin

        if (!searchText) {
            autocompleteList.innerHTML = '';
            autocompleteList.classList.add('hidden');
            return;
        }

        const existingItems = getExistingItems();
        const matches = existingItems.filter(item => 
            item.toLowerCase().includes(searchText.toLowerCase()) && 
            item.toLowerCase() !== searchText.toLowerCase()
        );

        if (matches.length > 0) {
            // Préserver les nombres et unités de la saisie originale
            const prefix = inputValue.match(/^\d+\s*(ml|cl|l|g|kg|cs|cc)?\s+/i)?.[0] || '';
            const suffix = inputValue.match(/\s+\d+\s*(ml|cl|l|g|kg|cs|cc)?$/i)?.[0] || '';

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

// Initialisation
window.addEventListener('resize', function() {
    const sidebar = document.getElementById('sidebar');
    if (window.innerWidth >= 768) {
        sidebar.style.height = '100%';
        if (isSidebarOpen) {
            sidebar.classList.remove('translate-y-full');
            sidebar.classList.remove('translate-x-full');
        }
    } else {
        if (isSidebarOpen) {
            sidebar.classList.remove('translate-x-full');
            sidebar.classList.remove('translate-y-full');
        }
    }
});

function setupMobileKeyboard() {
    const inputs = document.querySelectorAll('#groupInput, #todoInput');
    
    inputs.forEach(input => {
        // Gérer la visibilité au focus/blur
        input.addEventListener('focus', () => {
            input.closest('.mobile-add-bar').classList.add('keyboard-open');
            // Scroll en haut de la page
            window.scrollTo(0, 0);
        });

        input.addEventListener('blur', () => {
            input.closest('.mobile-add-bar').classList.remove('keyboard-open');
        });

        // Gérer la soumission
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                if (input.id === 'groupInput') {
                    addGroup();
                } else {
                    addTodo();
                }
            }
        });
    });
}

// Appeler la fonction au chargement
document.addEventListener('DOMContentLoaded', setupMobileKeyboard);
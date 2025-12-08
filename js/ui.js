// js/ui.js
import { mdeInstances } from './config.js';

export function createSubsection(title = 'Nouvelle Section', content = '', colorSet, isClosed = false) {
    const subDiv = document.createElement('div');
    subDiv.className = 'subsection-card p-4 rounded-lg shadow-sm mb-3 border border-gray-100';
    subDiv.style.backgroundColor = colorSet.easymdeBg;
    
    const uniqueId = `mde-${crypto.randomUUID()}`;
    
    subDiv.innerHTML = `
        <div class="flex justify-between items-center mb-2">
            <div class="flex items-center space-x-2 w-full">
                <span class="drag-handle-sub cursor-grab text-gray-400">☰</span>
                <button class="toggle-subsection-btn text-gray-500">
                    <svg class="w-4 h-4 toggle-icon ${isClosed ? 'is-closed' : ''}" fill="currentColor" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"/></svg>
                </button>
                <input type="text" class="subsection-title bg-transparent border-b border-transparent focus:border-gray-400 focus:outline-none w-full font-medium text-gray-800" value="${title}">
            </div>
            <button class="delete-subsection-btn text-gray-400 hover:text-red-500 transition-colors">🗑️</button>
        </div>
        <div class="subsection-content-wrapper collapsible-content ${isClosed ? 'is-closed' : ''}">
            <textarea id="${uniqueId}"></textarea>
            <div class="print-content"></div>
        </div>
    `;

    setTimeout(() => {
        const ta = document.getElementById(uniqueId);
        if(!ta) return;
        
        const easyMDE = new EasyMDE({
            element: ta,
            initialValue: content,
            toolbar: ['bold', 'italic', 'heading', '|', 'unordered-list', 'ordered-list', '|', 'code', 'quote'],
            status: false,
            spellChecker: false,
            minHeight: '120px'
        });
        
        // CSS Hack pour EasyMDE background
        easyMDE.codemirror.getWrapperElement().style.setProperty('--easymde-bg', colorSet.easymdeBg);
        
        mdeInstances.set(uniqueId, easyMDE);
        easyMDE.codemirror.on("change", () => {
            subDiv.querySelector('.print-content').textContent = easyMDE.value();
        });
        subDiv.querySelector('.print-content').textContent = easyMDE.value();
    }, 50);

    return subDiv;
}

export function createPillar(title = 'Nouveau Pilier', colorSet, subsections = [], isClosed = false) {
    const pillarDiv = document.createElement('div');
    pillarDiv.className = `pillar-card p-5 rounded-lg shadow-md mb-6 ${colorSet.bg} border ${colorSet.border}`;
    pillarDiv.dataset.colorSet = JSON.stringify(colorSet);

    pillarDiv.innerHTML = `
        <div class="flex justify-between items-center mb-4">
            <div class="flex items-center space-x-2 w-full">
                <span class="drag-handle-pillar cursor-grab text-gray-500 text-xl">☰</span>
                <button class="toggle-pillar-btn text-gray-600 p-1">
                     <svg class="w-5 h-5 toggle-icon ${isClosed ? 'is-closed' : ''}" fill="currentColor" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"/></svg>
                </button>
                <input type="text" class="pillar-title text-xl font-bold bg-transparent border-b-2 border-transparent focus:border-gray-500 focus:outline-none w-full ${colorSet.text}" value="${title}">
            </div>
            <div class="flex space-x-2 no-print shrink-0">
                <button class="add-subsection-btn bg-white/80 hover:bg-white text-gray-700 px-3 py-1 rounded text-sm shadow-sm transition">
                    + Section
                </button>
                <button class="delete-pillar-btn bg-red-500 text-white px-3 py-1 rounded text-sm shadow-sm hover:bg-red-600 transition">
                    Supprimer
                </button>
            </div>
        </div>
        <div class="subsections-container space-y-4 ml-2 collapsible-content ${isClosed ? 'is-closed' : ''}"></div>
    `;
    
    const subContainer = pillarDiv.querySelector('.subsections-container');
    subsections.forEach(sub => subContainer.appendChild(createSubsection(sub.title, sub.content, colorSet, sub.isClosed)));
    
    if(typeof Sortable !== 'undefined') {
        new Sortable(subContainer, { animation: 150, handle: '.drag-handle-sub', ghostClass: 'sortable-ghost' });
    }
    return pillarDiv;
}
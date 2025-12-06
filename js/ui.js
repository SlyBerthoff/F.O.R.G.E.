// js/ui.js
import { mdeInstances } from './config.js';
import { handleReformulateLogic } from './gemini.js';

let onReformulationRequest = null;
export function setReformulationCallback(cb) { onReformulationRequest = cb; }

export function createSubsection(title = 'Nouvelle Sous-section', content = '', colorSet, isClosed = false) {
    const subDiv = document.createElement('div');
    subDiv.className = 'subsection-card p-4 rounded-lg shadow-sm transition-all duration-300 ease-in-out';
    subDiv.style.backgroundColor = colorSet.easymdeBg;
    const uniqueId = `mde-${crypto.randomUUID()}`;
    
    subDiv.innerHTML = `
        <div class="flex justify-between items-center mb-2">
            <div class="flex items-center space-x-1 w-full">
                <button class="drag-handle-sub no-print text-gray-400 hover:text-gray-600 p-1 rounded-full transition-colors" tabindex="-1">
                   <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" stroke="currentColor"><path d="M4 6H20M4 12H20M4 18H20" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path></svg>
                </button>
                <div class="flex items-center space-x-1 w-full cursor-pointer toggle-subsection-btn">
                    <button class="toggle-btn no-print text-gray-400 hover:text-gray-600 p-1 rounded-full transition-colors" tabindex="-1">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 toggle-icon ${isClosed ? 'is-closed' : ''}" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd" /></svg>
                    </button>
                    <input type="text" class="subsection-title text-lg font-medium text-gray-800 bg-transparent border-b border-transparent ${colorSet.ring} focus:border-gray-400 focus:ring-0 focus:outline-none w-full p-1" value="${title}" placeholder="Titre (Titre niv. 3)">
                </div>
            </div>
            <button class="delete-subsection-btn no-print text-gray-400 hover:text-red-600 transition-colors p-1 rounded-full ml-2 flex-shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" /></svg>
            </button>
        </div>
        <div class="subsection-content-wrapper collapsible-content ${isClosed ? 'is-closed' : ''}">
            <textarea id="${uniqueId}"></textarea>
            <div class="print-content" style="--print-bg-color: ${colorSet.easymdeBg}"></div>
        </div>
    `;

    setTimeout(() => {
        const ta = document.getElementById(uniqueId);
        if(!ta) return;
        
        const easyMDE = new EasyMDE({
            element: ta,
            initialValue: content,
            toolbar: [
                'bold', 'italic', 'unordered-list', 'ordered-list', 'quote', 'code', '|',
                {
                    name: "reformulate",
                    action: async (editor) => {
                        const mainTitle = document.getElementById('main-title').value;
                        const pillarTitle = subDiv.closest('.pillar-card')?.querySelector('.pillar-title')?.value || "";
                        const subTitle = subDiv.querySelector('.subsection-title').value;
                        
                        const newText = await handleReformulateLogic(editor, mainTitle, pillarTitle, subTitle);
                        if(newText && onReformulationRequest) {
                            onReformulationRequest(editor, newText);
                        }
                    },
                    className: "fa fa-magic",
                    title: "Rédiger / Reformuler avec l'IA",
                    noDisable: true,
                    icon: '<span class="flex items-center justify-center w-full h-full text-purple-600 font-bold text-lg">✨</span>'
                }
            ],
            status: false, spellChecker: false, minHeight: '100px',
            renderingConfig: { codeSyntaxHighlighting: false }
        });
        
        const cmElement = easyMDE.codemirror.getWrapperElement();
        const toolbarElement = cmElement.previousSibling;
        cmElement.style.setProperty('--easymde-bg', colorSet.easymdeBg);
        if(toolbarElement) toolbarElement.style.setProperty('--easymde-bg', colorSet.easymdeBg);
        
        mdeInstances.set(uniqueId, easyMDE);
        easyMDE.codemirror.on("change", () => {
            subDiv.querySelector('.print-content').textContent = easyMDE.value();
        });
        subDiv.querySelector('.print-content').textContent = easyMDE.value();
    }, 10);

    return subDiv;
}

export function createPillar(title = 'Nouveau Pilier', colorSet, subsections = [], isClosed = false) {
    const pillarDiv = document.createElement('div');
    pillarDiv.className = 'pillar-card p-5 rounded-lg shadow-md hover:shadow-lg transition-all duration-300 ease-in-out';
    pillarDiv.classList.add(colorSet.bg, colorSet.text);
    pillarDiv.style.borderColor = colorSet.border;
    pillarDiv.style.setProperty('--print-color', colorSet.printText);
    pillarDiv.dataset.colorSet = JSON.stringify(colorSet);

    pillarDiv.innerHTML = `
        <div class="flex flex-col sm:flex-row justify-between sm:items-center mb-4">
            <div class="flex items-center space-x-1 flex-grow w-full">
                 <button class="drag-handle-pillar no-print text-current hover:opacity-70 p-1 rounded-full transition-opacity" tabindex="-1">
                    <svg class="h-6 w-6" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" stroke="currentColor"><path d="M4 6H20M4 12H20M4 18H20" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path></svg>
                </button>
                <div class="flex items-center space-x-1 flex-grow w-full cursor-pointer toggle-pillar-btn">
                    <button class="toggle-btn no-print text-current hover:opacity-70 p-1 rounded-full transition-opacity" tabindex="-1">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 toggle-icon ${isClosed ? 'is-closed' : ''}" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd" /></svg>
                    </button>
                    <input type="text" class="pillar-title text-2xl font-semibold bg-transparent border-b-2 border-transparent ${colorSet.ring} focus:border-current focus:ring-0 focus:outline-none p-1 -ml-1 rounded-md w-full" value="${title}" placeholder="Titre (Titre niv. 2)">
                </div>
            </div>
            <div class="flex space-x-2 mt-3 sm:mt-0 no-print flex-shrink-0 ml-4">
                <button class="suggest-sections-btn py-1 px-3 bg-white bg-opacity-80 hover:bg-opacity-100 text-sm font-medium rounded-md shadow-sm transition-all flex items-center space-x-1.5">
                    <span class="gemini-btn-text">✨ Suggérer</span><span class="gemini-spinner hidden"></span>
                </button>
                <button class="add-subsection-btn py-1 px-3 bg-white bg-opacity-80 hover:bg-opacity-100 text-sm font-medium rounded-md shadow-sm transition-all">Ajouter Section</button>
                <button class="delete-pillar-btn py-1 px-3 bg-red-500 hover:bg-red-600 text-white text-sm font-medium rounded-md shadow-sm transition-all">Supprimer</button>
            </div>
        </div>
        <div class="subsections-container space-y-4 ml-0 md:ml-4 collapsible-content ${isClosed ? 'is-closed' : ''}"></div>
    `;
    
    const subContainer = pillarDiv.querySelector('.subsections-container');
    subsections.forEach(sub => subContainer.appendChild(createSubsection(sub.title, sub.content, colorSet, sub.isClosed || false)));
    
    // Init Sortable si chargé
    if(typeof Sortable !== 'undefined') {
        new Sortable(subContainer, { animation: 150, handle: '.drag-handle-sub', ghostClass: 'sortable-ghost' });
    }
    return pillarDiv;
}
// js/main.js
import { mdeInstances, getNextColorSet, resetColorIndex } from './config.js';
import { createPillar, createSubsection, setReformulationCallback } from './ui.js';
import { showToast, getTimestamp } from './utils.js';
import { callGemini } from './gemini.js';
import * as Drive from './drive.js';

document.addEventListener('DOMContentLoaded', () => {
    const pillarsContainer = document.getElementById('pillars-container');
    const addPillarBtn = document.getElementById('add-pillar-btn');
    const mainTitleInput = document.getElementById('main-title');

    // Init Drive Auth si configuré
    Drive.initDrive();

    // --- MODALES (Settings, Reformulation, Drive) ---

    // 1. Settings
    const settingsModal = document.getElementById('settings-modal');
    const apiKeyInput = document.getElementById('api-key-input');
    const clientIdInput = document.getElementById('client-id-input');
    
    document.getElementById('settings-btn').addEventListener('click', () => {
        apiKeyInput.value = localStorage.getItem('gemini_api_key') || '';
        clientIdInput.value = localStorage.getItem('google_client_id') || '';
        settingsModal.classList.remove('hidden');
    });
    
    document.getElementById('close-settings-btn').addEventListener('click', () => settingsModal.classList.add('hidden'));
    
    document.getElementById('save-settings-btn').addEventListener('click', () => {
        const key = apiKeyInput.value.trim();
        const cid = clientIdInput.value.trim();
        
        if (key) localStorage.setItem('gemini_api_key', key);
        else localStorage.removeItem('gemini_api_key');
        
        // Update Drive module
        Drive.updateClientId(cid);

        showToast('Configuration enregistrée !', 'success');
        settingsModal.classList.add('hidden');
    });

    // 2. Reformulation (Callback UI)
    const reformulationModal = document.getElementById('reformulation-modal');
    const originalTextDisplay = document.getElementById('original-text-display');
    const suggestedTextDisplay = document.getElementById('suggested-text-display');
    let currentEditorForReformulation = null;
    let reformulationMDE = null;

    setReformulationCallback((editor, newText) => {
        currentEditorForReformulation = editor;
        originalTextDisplay.textContent = editor.value() || "(Vide)";
        reformulationModal.classList.remove('hidden');
        
        if (!reformulationMDE) {
            reformulationMDE = new EasyMDE({
                element: suggestedTextDisplay,
                initialValue: newText,
                toolbar: ['bold', 'italic', 'unordered-list', 'ordered-list', 'quote', 'code'],
                status: false, spellChecker: false, minHeight: '200px'
            });
        } else {
            reformulationMDE.value(newText);
            setTimeout(() => reformulationMDE.codemirror.refresh(), 50);
        }
    });

    const closeRef = () => { reformulationModal.classList.add('hidden'); currentEditorForReformulation = null; };
    document.getElementById('close-reformulation-btn').addEventListener('click', closeRef);
    document.getElementById('cancel-reformulation-btn').addEventListener('click', closeRef);
    document.getElementById('apply-reformulation-btn').addEventListener('click', () => {
        if (currentEditorForReformulation && reformulationMDE) {
            currentEditorForReformulation.value(reformulationMDE.value());
            showToast('Modification appliquée !', 'success');
        }
        closeRef();
    });

    // 3. Drive Load Modal
    const driveModal = document.getElementById('drive-modal');
    const driveFileList = document.getElementById('drive-file-list');
    
    document.getElementById('close-drive-modal-btn').addEventListener('click', () => driveModal.classList.add('hidden'));
    document.getElementById('load-drive-btn').addEventListener('click', () => {
        driveModal.classList.remove('hidden');
        driveFileList.innerHTML = '<p class="text-center text-gray-500">Chargement...</p>';
        Drive.listDriveFiles((files) => {
            driveFileList.innerHTML = '';
            if (files && files.length > 0) {
                const ul = document.createElement('ul');
                ul.className = "space-y-2";
                files.forEach(file => {
                    const li = document.createElement('li');
                    li.className = "flex justify-between items-center p-3 bg-white border rounded hover:bg-gray-50 cursor-pointer";
                    li.innerHTML = `<div><div class="font-medium text-gray-800">${file.name}</div><div class="text-xs text-gray-500">${new Date(file.modifiedTime).toLocaleString()}</div></div>`;
                    li.onclick = () => {
                        Drive.loadFileContent(file.id, (data) => {
                            rebuildUi(data);
                            driveModal.classList.add('hidden');
                        });
                    };
                    ul.appendChild(li);
                });
                driveFileList.appendChild(ul);
            } else {
                driveFileList.innerHTML = '<p class="text-center text-gray-500">Aucun fichier trouvé.</p>';
            }
        });
    });

    // --- LOGIQUE PRINCIPALE (Events) ---

    // Délégation d'événements
    pillarsContainer.addEventListener('click', async (e) => {
        if (e.target.closest('.drag-handle-pillar') || e.target.closest('.drag-handle-sub')) { e.stopPropagation(); return; }
        
        // Toggle Pilier
        const toggleP = e.target.closest('.toggle-pillar-btn');
        if (toggleP && !e.target.matches('.pillar-title')) {
            toggleP.closest('.pillar-card').querySelector('.subsections-container').classList.toggle('is-closed');
            toggleP.querySelector('.toggle-icon').classList.toggle('is-closed');
            return;
        }
        // Toggle Section
        const toggleS = e.target.closest('.toggle-subsection-btn');
        if (toggleS && !e.target.matches('.subsection-title')) {
            toggleS.closest('.subsection-card').querySelector('.subsection-content-wrapper').classList.toggle('is-closed');
            toggleS.querySelector('.toggle-icon').classList.toggle('is-closed');
            return;
        }

        // Ajouter Sous-section
        const addSub = e.target.closest('.add-subsection-btn');
        if (addSub) {
            const card = addSub.closest('.pillar-card');
            const colorSet = JSON.parse(card.dataset.colorSet);
            const newSub = createSubsection('Nouvelle Sous-section', '', colorSet, false);
            card.querySelector('.subsections-container').appendChild(newSub);
            setTimeout(() => {
                const id = newSub.querySelector('textarea').id;
                mdeInstances.get(id)?.codemirror.focus();
            }, 500);
            return;
        }

        // Supprimer
        const delSub = e.target.closest('.delete-subsection-btn');
        if (delSub && confirm("Supprimer cette section ?")) {
            const card = delSub.closest('.subsection-card');
            const id = card.querySelector('textarea').id;
            if(mdeInstances.has(id)) { mdeInstances.get(id).toTextArea(); mdeInstances.delete(id); }
            card.remove(); return;
        }
        const delPil = e.target.closest('.delete-pillar-btn');
        if (delPil && confirm("Supprimer ce pilier ?")) {
            const card = delPil.closest('.pillar-card');
            card.querySelectorAll('textarea').forEach(t => { 
                if(mdeInstances.has(t.id)) { mdeInstances.get(t.id).toTextArea(); mdeInstances.delete(t.id); } 
            });
            card.remove(); return;
        }

        // Suggestion Gemini (Pilier)
        const sugBtn = e.target.closest('.suggest-sections-btn');
        if(sugBtn) {
            const pillarCard = sugBtn.closest('.pillar-card');
            const pillarTitle = pillarCard.querySelector('.pillar-title').value;
            const spinner = sugBtn.querySelector('.gemini-spinner');
            const btnText = sugBtn.querySelector('.gemini-btn-text');
            
            spinner.classList.remove('hidden'); btnText.classList.add('hidden');
            const prompt = `Le titre principal est "${mainTitleInput.value}". Le pilier est "${pillarTitle}". Propose 3 à 5 titres de sous-sections pertinentes. Format JSON: ["Titre 1", "Titre 2"]`;
            
            const res = await callGemini("Tu es un assistant JSON.", prompt, { type: "ARRAY", items: { type: "STRING" } });
            
            try {
                const titles = JSON.parse(res);
                const colorSet = JSON.parse(pillarCard.dataset.colorSet);
                titles.forEach(t => {
                    const sub = createSubsection(t, '', colorSet, false);
                    pillarCard.querySelector('.subsections-container').appendChild(sub);
                });
            } catch(e) { showToast("Erreur suggestion", "error"); }
            spinner.classList.add('hidden'); btnText.classList.remove('hidden');
        }
    });

    addPillarBtn.addEventListener('click', () => {
        const newPillar = createPillar('Nouveau Pilier', getNextColorSet(), [{title:'Nouvelle Section', content:'', isClosed:false}]);
        pillarsContainer.appendChild(newPillar);
        newPillar.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });

    // Helper: Collect Data
    function getDataAsObject() {
        const data = { mainTitle: mainTitleInput.value, pillars: [] };
        pillarsContainer.querySelectorAll('.pillar-card').forEach(pillar => {
            const p = {
                title: pillar.querySelector('.pillar-title').value,
                colorSet: JSON.parse(pillar.dataset.colorSet),
                isClosed: pillar.querySelector('.subsections-container').classList.contains('is-closed'),
                subsections: []
            };
            pillar.querySelectorAll('.subsection-card').forEach(sub => {
                const mde = mdeInstances.get(sub.querySelector('textarea').id);
                p.subsections.push({
                    title: sub.querySelector('.subsection-title').value,
                    content: mde ? mde.value() : sub.querySelector('textarea').value,
                    isClosed: sub.querySelector('.subsection-content-wrapper').classList.contains('is-closed')
                });
            });
            data.pillars.push(p);
        });
        return data;
    }

    // Helper: Rebuild UI
    function rebuildUi(data) {
        pillarsContainer.innerHTML = ''; mdeInstances.clear(); resetColorIndex();
        mainTitleInput.value = data.mainTitle || 'Mon Gem Custom';
        if (data.pillars) data.pillars.forEach(p => {
            const color = p.colorSet || getNextColorSet();
            const subs = p.subsections || [{title: 'Nouvelle Sous-section', content: '', isClosed: false}];
            pillarsContainer.appendChild(createPillar(p.title, color, subs, p.isClosed));
        });
    }

    // --- BOUTONS FOOTER ---
    
    // Save Drive
    document.getElementById('save-drive-btn').addEventListener('click', () => {
        const fileName = `${(mainTitleInput.value || 'config').replace(/\s+/g, '-').toLowerCase()}_${getTimestamp()}.json`;
        Drive.saveFileToDrive(getDataAsObject(), fileName);
    });

    // Local JSON
    document.getElementById('export-json-btn').addEventListener('click', () => {
        const blob = new Blob([JSON.stringify(getDataAsObject(), null, 2)], {type: 'application/json'});
        const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
        a.download = `config_${getTimestamp()}.json`;
        a.click();
    });
    
    const fileInput = document.getElementById('json-file-input');
    document.getElementById('import-json-btn').addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', (e) => {
        const r = new FileReader();
        r.onload = (ev) => { try { rebuildUi(JSON.parse(ev.target.result)); } catch(e){ showToast("JSON invalide", "error"); }};
        r.readAsText(e.target.files[0]); e.target.value = null;
    });

    // Export MD
    document.getElementById('export-md-btn').addEventListener('click', () => {
        let md = `# ${mainTitleInput.value}\n\n`;
        pillarsContainer.querySelectorAll('.pillar-card').forEach(p => {
            md += `## ${p.querySelector('.pillar-title').value}\n\n`;
            p.querySelectorAll('.subsection-card').forEach(s => {
                const mde = mdeInstances.get(s.querySelector('textarea').id);
                md += `### ${s.querySelector('.subsection-title').value}\n\n${mde ? mde.value() : ''}\n\n`;
            });
        });
        document.getElementById('markdown-output').textContent = md.trim();
        document.getElementById('markdown-modal').classList.remove('hidden');
    });
    
    document.getElementById('close-modal-btn').addEventListener('click', () => document.getElementById('markdown-modal').classList.add('hidden'));
    document.getElementById('copy-md-btn').addEventListener('click', () => { navigator.clipboard.writeText(document.getElementById('markdown-output').textContent); showToast('Copié !', 'success'); });
    
    // PDF
    document.getElementById('export-pdf-btn').addEventListener('click', () => window.print());

    // Init Defaults
    new Sortable(pillarsContainer, { animation: 150, handle: '.drag-handle-pillar', ghostClass: 'sortable-ghost' });
    rebuildUi({
        mainTitle: 'Mon Gem Custom',
        pillars: [{ title: 'Contexte', isClosed: false, subsections: [ { title: 'Rôle', content: '', isClosed: false } ] }]
    });
});
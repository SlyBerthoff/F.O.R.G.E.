// js/main.js
import { mdeInstances, getNextColorSet, resetColorIndex } from './config.js';
import { createPillar, createSubsection } from './ui.js';
import { showToast, getTimestamp } from './utils.js';
import * as Drive from './drive.js';

document.addEventListener('DOMContentLoaded', () => {
    // Éléments DOM Principaux
    const pillarsContainer = document.getElementById('pillars-container');
    const mainTitleInput = document.getElementById('main-title');

    // Etat Local
    let savedFolderId = localStorage.getItem('gem_drive_folder_id');
    let savedFolderName = localStorage.getItem('gem_drive_folder_name') || 'Racine';

    // --- 1. Gestion des Paramètres & Drive Auth ---
    const settingsModal = document.getElementById('settings-modal');
    const clientIdInput = document.getElementById('client-id-input');
    const authStatusText = document.getElementById('auth-status-text');
    const folderSection = document.getElementById('folder-section');
    const currentFolderNameDisplay = document.getElementById('current-folder-name');

    // Initialisation
    clientIdInput.value = localStorage.getItem('google_client_id') || '';
    if (clientIdInput.value) {
        Drive.initTokenClient(clientIdInput.value);
    }
    
    // UI Update sur changement dossier
    function updateFolderUI() {
        currentFolderNameDisplay.textContent = savedFolderName;
    }
    updateFolderUI();

    // Event: Connexion réussie
    document.addEventListener('drive-connected', () => {
        authStatusText.textContent = "Connecté ✅";
        authStatusText.className = "text-sm font-medium text-green-600";
        folderSection.classList.remove('opacity-50', 'pointer-events-none'); // Active section dossier
    });

    // Bouton Settings
    document.getElementById('settings-btn').addEventListener('click', () => {
        settingsModal.classList.remove('hidden');
        if (Drive.isConnected()) {
             authStatusText.textContent = "Connecté ✅";
             authStatusText.className = "text-sm font-medium text-green-600";
             folderSection.classList.remove('opacity-50', 'pointer-events-none');
        }
    });

    // Bouton Login Google
    document.getElementById('google-login-btn').addEventListener('click', () => {
        const cid = clientIdInput.value.trim();
        if(!cid) { showToast("Client ID manquant", "error"); return; }
        
        localStorage.setItem('google_client_id', cid);
        Drive.initTokenClient(cid); // Re-init si changé
        Drive.login();
    });

    // Sauvegarder Settings
    document.getElementById('save-settings-btn').addEventListener('click', () => {
        settingsModal.classList.add('hidden');
    });
    document.getElementById('close-settings-btn').addEventListener('click', () => settingsModal.classList.add('hidden'));


    // --- 2. Gestion Sélection Dossier (Picker Simplifié) ---
    const folderPickerModal = document.getElementById('folder-picker-modal');
    const folderListContainer = document.getElementById('folder-list-container');
    
    document.getElementById('change-folder-btn').addEventListener('click', async () => {
        folderPickerModal.classList.remove('hidden');
        folderListContainer.innerHTML = '<p class="text-center text-gray-500 py-4">Recherche des dossiers...</p>';
        
        const folders = await Drive.listFolders();
        folderListContainer.innerHTML = '';

        // Option "Racine"
        const rootDiv = document.createElement('div');
        rootDiv.className = "p-3 hover:bg-gray-100 cursor-pointer border-b flex items-center gap-2";
        rootDiv.innerHTML = "📁 <b>Racine (Mon Drive)</b>";
        rootDiv.onclick = () => selectFolder(null, "Racine");
        folderListContainer.appendChild(rootDiv);

        if (folders.length > 0) {
            folders.forEach(f => {
                const div = document.createElement('div');
                div.className = "p-3 hover:bg-gray-100 cursor-pointer border-b flex items-center gap-2 text-sm";
                div.innerHTML = `📁 ${f.name}`;
                div.onclick = () => selectFolder(f.id, f.name);
                folderListContainer.appendChild(div);
            });
        } else {
            folderListContainer.innerHTML += '<p class="text-center text-gray-400 text-xs mt-2">Aucun dossier trouvé (scope limité aux fichiers créés par l\'app).</p>';
        }
    });

    document.getElementById('create-app-folder-btn').addEventListener('click', async () => {
        const newFolder = await Drive.createAppFolder("CustomGem Projects");
        if(newFolder) {
            selectFolder(newFolder.id, newFolder.name);
            showToast("Dossier créé et sélectionné !", "success");
        }
    });

    function selectFolder(id, name) {
        savedFolderId = id;
        savedFolderName = name;
        if(id) localStorage.setItem('gem_drive_folder_id', id);
        else localStorage.removeItem('gem_drive_folder_id');
        
        localStorage.setItem('gem_drive_folder_name', name);
        
        updateFolderUI();
        folderPickerModal.classList.add('hidden');
    }
    
    document.getElementById('close-folder-picker').addEventListener('click', () => folderPickerModal.classList.add('hidden'));


    // --- 3. Logique App Principale ---

    // Délégation d'événements (Le Fix des Boutons)
    pillarsContainer.addEventListener('click', (e) => {
        if (e.target.closest('.drag-handle-pillar') || e.target.closest('.drag-handle-sub')) return;

        // Toggle Pillar
        const toggleP = e.target.closest('.toggle-pillar-btn');
        if (toggleP) {
            const card = toggleP.closest('.pillar-card');
            card.querySelector('.subsections-container').classList.toggle('is-closed');
            toggleP.querySelector('.toggle-icon').classList.toggle('is-closed');
            return;
        }

        // Toggle Section
        const toggleS = e.target.closest('.toggle-subsection-btn');
        if (toggleS) {
            const card = toggleS.closest('.subsection-card');
            card.querySelector('.subsection-content-wrapper').classList.toggle('is-closed');
            toggleS.querySelector('.toggle-icon').classList.toggle('is-closed');
            return;
        }

        // Add Section
        const addSub = e.target.closest('.add-subsection-btn');
        if (addSub) {
            const card = addSub.closest('.pillar-card');
            const colorSet = JSON.parse(card.dataset.colorSet);
            const newSub = createSubsection('Nouvelle Section', '', colorSet, false);
            card.querySelector('.subsections-container').appendChild(newSub);
            // Focus textarea (petit délai pour le DOM)
            setTimeout(() => {
                const id = newSub.querySelector('textarea').id;
                const mde = mdeInstances.get(id);
                if(mde) mde.codemirror.focus();
            }, 200);
            return;
        }

        // Delete Logic
        const delSub = e.target.closest('.delete-subsection-btn');
        if (delSub && confirm("Supprimer cette section ?")) {
            const card = delSub.closest('.subsection-card');
            const id = card.querySelector('textarea').id;
            if(mdeInstances.has(id)) { mdeInstances.get(id).toTextArea(); mdeInstances.delete(id); }
            card.remove();
            return;
        }
        
        const delPil = e.target.closest('.delete-pillar-btn');
        if (delPil && confirm("Supprimer ce pilier complet ?")) {
            const card = delPil.closest('.pillar-card');
            card.querySelectorAll('textarea').forEach(t => { 
                if(mdeInstances.has(t.id)) { mdeInstances.get(t.id).toTextArea(); mdeInstances.delete(t.id); }
            });
            card.remove();
            return;
        }
    });

    document.getElementById('add-pillar-btn').addEventListener('click', () => {
        const p = createPillar('Nouveau Pilier', getNextColorSet(), [{title:'Section 1', content:''}]);
        pillarsContainer.appendChild(p);
        p.scrollIntoView({behavior:'smooth'});
    });

    // --- 4. Exports & Imports ---

    // Drive Save
    document.getElementById('save-drive-btn').addEventListener('click', () => {
        const data = getDataAsObject();
        const safeTitle = (mainTitleInput.value || 'projet').replace(/[^a-z0-9]/gi, '-').toLowerCase();
        const filename = `${safeTitle}_${getTimestamp()}.json`;
        
        Drive.saveFile(data, filename, savedFolderId);
    });

    // Drive Load
    const driveModal = document.getElementById('drive-modal');
    const driveFileList = document.getElementById('drive-file-list');
    
    document.getElementById('load-drive-btn').addEventListener('click', async () => {
        if (!Drive.isConnected()) { showToast("Connectez-vous dans les paramètres", "error"); return; }
        
        driveModal.classList.remove('hidden');
        driveFileList.innerHTML = '<p class="text-center text-gray-500">Chargement...</p>';
        
        const files = await Drive.listJsonFiles();
        driveFileList.innerHTML = '';
        
        if (files.length === 0) {
            driveFileList.innerHTML = '<p class="text-center">Aucun fichier JSON trouvé.</p>';
            return;
        }

        files.forEach(f => {
            const div = document.createElement('div');
            div.className = "flex justify-between p-3 border-b hover:bg-gray-50 cursor-pointer items-center";
            div.innerHTML = `<span>${f.name}</span> <span class="text-xs text-gray-400">${new Date(f.modifiedTime).toLocaleDateString()}</span>`;
            div.onclick = async () => {
                const content = await Drive.loadFileContent(f.id);
                if(content) {
                    rebuildUi(content);
                    driveModal.classList.add('hidden');
                    showToast("Projet chargé !", "success");
                }
            };
            driveFileList.appendChild(div);
        });
    });
    document.getElementById('close-drive-modal-btn').addEventListener('click', () => driveModal.classList.add('hidden'));

    // Local JSON / Markdown (Logic standard inchangée)
    document.getElementById('export-json-btn').addEventListener('click', () => {
        const blob = new Blob([JSON.stringify(getDataAsObject(), null, 2)], {type:'application/json'});
        const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `projet_${getTimestamp()}.json`; a.click();
    });

    document.getElementById('import-json-btn').addEventListener('click', () => document.getElementById('json-file-input').click());
    document.getElementById('json-file-input').addEventListener('change', (e) => {
        const r = new FileReader();
        r.onload = (ev) => rebuildUi(JSON.parse(ev.target.result));
        r.readAsText(e.target.files[0]); e.target.value = '';
    });

    document.getElementById('export-md-btn').addEventListener('click', () => {
        let md = `# ${mainTitleInput.value}\n\n`;
        pillarsContainer.querySelectorAll('.pillar-card').forEach(p => {
            md += `## ${p.querySelector('.pillar-title').value}\n\n`;
            p.querySelectorAll('.subsection-card').forEach(s => {
                const mde = mdeInstances.get(s.querySelector('textarea').id);
                md += `### ${s.querySelector('.subsection-title').value}\n\n${mde ? mde.value() : ''}\n\n`;
            });
        });
        document.getElementById('markdown-output').textContent = md;
        document.getElementById('markdown-modal').classList.remove('hidden');
    });
    document.getElementById('close-md-modal-btn').addEventListener('click', () => document.getElementById('markdown-modal').classList.add('hidden'));
    document.getElementById('copy-md-btn').addEventListener('click', () => {
         navigator.clipboard.writeText(document.getElementById('markdown-output').textContent);
         showToast("Copié !", "success");
    });


    // --- Helpers ---
    function getDataAsObject() {
        return {
            mainTitle: mainTitleInput.value,
            pillars: Array.from(pillarsContainer.querySelectorAll('.pillar-card')).map(p => ({
                title: p.querySelector('.pillar-title').value,
                colorSet: JSON.parse(p.dataset.colorSet),
                isClosed: p.querySelector('.subsections-container').classList.contains('is-closed'),
                subsections: Array.from(p.querySelectorAll('.subsection-card')).map(s => ({
                    title: s.querySelector('.subsection-title').value,
                    content: mdeInstances.get(s.querySelector('textarea').id)?.value() || '',
                    isClosed: s.querySelector('.subsection-content-wrapper').classList.contains('is-closed')
                }))
            }))
        };
    }

    function rebuildUi(data) {
        pillarsContainer.innerHTML = ''; mdeInstances.clear(); resetColorIndex();
        mainTitleInput.value = data.mainTitle || '';
        (data.pillars || []).forEach(p => {
            const col = p.colorSet || getNextColorSet();
            pillarsContainer.appendChild(createPillar(p.title, col, p.subsections || [], p.isClosed));
        });
    }

    // Init Defaults
    new Sortable(pillarsContainer, { animation: 150, handle: '.drag-handle-pillar', ghostClass: 'sortable-ghost' });
    rebuildUi({ mainTitle: "Mon Gem Custom", pillars: [{title:"Contexte", subsections:[{title:"Rôle", content:""}]}]});
});
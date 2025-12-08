// js/main.js
import { mdeInstances, getNextColorSet, resetColorIndex } from './config.js';
import { createPillar, createSubsection } from './ui.js';
import { showToast, getTimestamp } from './utils.js';
import * as Drive from './drive.js';

// ============================================================
// CONFIGURATION GOOGLE DRIVE
// Collez ici votre Client ID récupéré depuis Google Cloud Console
const GOOGLE_CLIENT_ID = "912917090028-6jmainstltc8q129h6hlsa026ik2boei.apps.googleusercontent.com"; 
// ============================================================

document.addEventListener('DOMContentLoaded', () => {
    try {
        const pillarsContainer = document.getElementById('pillars-container');
        const mainTitleInput = document.getElementById('main-title');

        if (!pillarsContainer) throw new Error("Container principal 'pillars-container' introuvable.");

        // --- Init Drive Automatique ---
        if (GOOGLE_CLIENT_ID && GOOGLE_CLIENT_ID.includes("googleusercontent.com")) {
            localStorage.setItem('google_client_id', GOOGLE_CLIENT_ID);
            Drive.initTokenClient(GOOGLE_CLIENT_ID);
        } else {
            console.warn("Google Client ID non configuré ou invalide dans js/main.js");
            showToast("Attention: Client ID manquant dans le code", "error");
        }

        // --- Helpers d'attachement d'événements ---
        function attach(id, event, handler) {
            const el = document.getElementById(id);
            if (el) el.addEventListener(event, handler);
            else console.warn(`Element introuvable: #${id}`);
        }

        // --- Boutons Principaux ---
        attach('add-pillar-btn', 'click', () => {
            const p = createPillar('Nouveau Pilier', getNextColorSet(), [{title:'Section 1', content:''}]);
            pillarsContainer.appendChild(p);
            p.scrollIntoView({behavior:'smooth'});
        });

        // --- Délégation pour Piliers/Sections ---
        pillarsContainer.addEventListener('click', (e) => {
            if (e.target.closest('.drag-handle-pillar') || e.target.closest('.drag-handle-sub')) return;

            // Toggle
            const toggleP = e.target.closest('.toggle-pillar-btn');
            if (toggleP) {
                toggleP.closest('.pillar-card').querySelector('.subsections-container').classList.toggle('is-closed');
                toggleP.querySelector('.toggle-icon').classList.toggle('is-closed');
                return;
            }
            const toggleS = e.target.closest('.toggle-subsection-btn');
            if (toggleS) {
                toggleS.closest('.subsection-card').querySelector('.subsection-content-wrapper').classList.toggle('is-closed');
                toggleS.querySelector('.toggle-icon').classList.toggle('is-closed');
                return;
            }

            // Actions
            const addSub = e.target.closest('.add-subsection-btn');
            if (addSub) {
                const card = addSub.closest('.pillar-card');
                const colorSet = JSON.parse(card.dataset.colorSet);
                const newSub = createSubsection('Nouvelle Section', '', colorSet, false);
                card.querySelector('.subsections-container').appendChild(newSub);
                setTimeout(() => {
                    const id = newSub.querySelector('textarea').id;
                    const mde = mdeInstances.get(id);
                    if(mde) mde.codemirror.focus();
                }, 200);
                return;
            }
            
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
        });

        // --- Modale Settings ---
        const settingsModal = document.getElementById('settings-modal');
        const authStatusText = document.getElementById('auth-status-text');
        const folderSection = document.getElementById('folder-section');

        // Mise à jour UI connexion
        document.addEventListener('drive-connected', () => {
            if(authStatusText) {
                authStatusText.textContent = "Connecté ✅";
                authStatusText.className = "text-sm font-bold text-green-600";
            }
            if(folderSection) folderSection.classList.remove('opacity-50', 'pointer-events-none');
            
            // Changer le texte du bouton aussi pour faire propre
            const loginBtn = document.getElementById('google-login-btn');
            if(loginBtn) {
                loginBtn.textContent = "Compte actif";
                loginBtn.classList.add('bg-green-600', 'hover:bg-green-700');
                loginBtn.classList.remove('bg-blue-600', 'hover:bg-blue-700');
                loginBtn.disabled = true; // Optionnel : empêcher le re-clic
            }
        });

        attach('settings-btn', 'click', () => {
            if(settingsModal) settingsModal.classList.remove('hidden');
            if (Drive.isConnected()) document.dispatchEvent(new CustomEvent('drive-connected'));
        });

        attach('close-settings-btn', 'click', () => settingsModal.classList.add('hidden'));
        attach('save-settings-btn', 'click', () => settingsModal.classList.add('hidden'));

        attach('google-login-btn', 'click', () => {
            // Utilisation directe de la constante
            if(GOOGLE_CLIENT_ID) {
                Drive.initTokenClient(GOOGLE_CLIENT_ID);
                Drive.login();
            } else {
                showToast("Erreur: Client ID non configuré dans le code", "error");
            }
        });

        // --- Folder Picker ---
        const folderModal = document.getElementById('folder-picker-modal');
        const folderList = document.getElementById('folder-list-container');
        const currentFolderLabel = document.getElementById('current-folder-name');
        
        let savedFolderName = localStorage.getItem('gem_drive_folder_name') || 'Racine (Mon Drive)';
        if(currentFolderLabel) currentFolderLabel.textContent = savedFolderName;

        attach('change-folder-btn', 'click', async () => {
            folderModal.classList.remove('hidden');
            folderList.innerHTML = '<p class="text-center text-gray-500 py-4">Chargement...</p>';
            
            const folders = await Drive.listFolders();
            folderList.innerHTML = '';
            
            const rootDiv = document.createElement('div');
            rootDiv.className = "p-3 hover:bg-gray-100 cursor-pointer border-b flex items-center gap-2";
            rootDiv.innerHTML = "📁 <b>Racine (Mon Drive)</b>";
            rootDiv.onclick = () => selectFolder(null, "Racine (Mon Drive)");
            folderList.appendChild(rootDiv);

            folders.forEach(f => {
                const div = document.createElement('div');
                div.className = "p-3 hover:bg-gray-100 cursor-pointer border-b flex items-center gap-2 text-sm";
                div.innerHTML = `📁 ${f.name}`;
                div.onclick = () => selectFolder(f.id, f.name);
                folderList.appendChild(div);
            });
        });

        function selectFolder(id, name) {
            if(id) localStorage.setItem('gem_drive_folder_id', id);
            else localStorage.removeItem('gem_drive_folder_id');
            localStorage.setItem('gem_drive_folder_name', name);
            if(currentFolderLabel) currentFolderLabel.textContent = name;
            folderModal.classList.add('hidden');
        }

        attach('close-folder-picker', 'click', () => folderModal.classList.add('hidden'));
        attach('create-app-folder-btn', 'click', async () => {
            const f = await Drive.createAppFolder();
            if(f) { selectFolder(f.id, f.name); showToast("Dossier créé !", "success"); }
        });

        // --- Actions Footer ---
        attach('save-drive-btn', 'click', () => {
            const data = getDataAsObject();
            const safeTitle = (mainTitleInput.value || 'projet').replace(/[^a-z0-9]/gi, '-').toLowerCase();
            const fname = `${safeTitle}_${getTimestamp()}.json`;
            const fid = localStorage.getItem('gem_drive_folder_id');
            Drive.saveFile(data, fname, fid);
        });

        attach('export-json-btn', 'click', () => {
            const blob = new Blob([JSON.stringify(getDataAsObject(), null, 2)], {type:'application/json'});
            const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `projet_${getTimestamp()}.json`; a.click();
        });

        attach('import-json-btn', 'click', () => document.getElementById('json-file-input').click());
        attach('json-file-input', 'change', (e) => {
            const r = new FileReader();
            r.onload = (ev) => rebuildUi(JSON.parse(ev.target.result));
            r.readAsText(e.target.files[0]); e.target.value = '';
        });

        // Markdown Export
        const mdModal = document.getElementById('markdown-modal');
        attach('export-md-btn', 'click', () => {
            let md = `# ${mainTitleInput.value}\n\n`;
            document.querySelectorAll('.pillar-card').forEach(p => {
                md += `## ${p.querySelector('.pillar-title').value}\n\n`;
                p.querySelectorAll('.subsection-card').forEach(s => {
                    const mde = mdeInstances.get(s.querySelector('textarea').id);
                    md += `### ${s.querySelector('.subsection-title').value}\n\n${mde ? mde.value() : ''}\n\n`;
                });
            });
            document.getElementById('markdown-output').textContent = md;
            mdModal.classList.remove('hidden');
        });
        attach('close-md-modal-btn', 'click', () => mdModal.classList.add('hidden'));
        attach('copy-md-btn', 'click', () => {
            navigator.clipboard.writeText(document.getElementById('markdown-output').textContent);
            showToast("Copié !", "success");
        });

        // Drive Load
        const driveModal = document.getElementById('drive-modal');
        const driveList = document.getElementById('drive-file-list');
        attach('load-drive-btn', 'click', async () => {
            if(!Drive.isConnected()) { showToast("Veuillez vous connecter dans les paramètres", "error"); return; }
            driveModal.classList.remove('hidden');
            driveList.innerHTML = '<p class="text-center text-gray-500">Chargement...</p>';
            const files = await Drive.listJsonFiles();
            driveList.innerHTML = '';
            files.forEach(f => {
                const div = document.createElement('div');
                div.className = "flex justify-between p-3 border-b hover:bg-gray-50 cursor-pointer items-center";
                div.innerHTML = `<span>${f.name}</span> <span class="text-xs text-gray-400">${new Date(f.modifiedTime).toLocaleDateString()}</span>`;
                div.onclick = async () => {
                    const content = await Drive.loadFileContent(f.id);
                    if(content) { rebuildUi(content); driveModal.classList.add('hidden'); }
                };
                driveList.appendChild(div);
            });
        });
        attach('close-drive-modal-btn', 'click', () => driveModal.classList.add('hidden'));

        // --- Helpers internes ---
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

        // Init Default
        new Sortable(pillarsContainer, { animation: 150, handle: '.drag-handle-pillar', ghostClass: 'sortable-ghost' });
        rebuildUi({mainTitle: "Mon Gem Custom", pillars: [{title:"Contexte", subsections:[{title:"Rôle", content:""}]}]});

    } catch (err) {
        console.error("FATAL ERROR in Main:", err);
        document.body.innerHTML += `<div style="position:fixed;top:0;left:0;background:red;color:white;padding:10px;">Erreur JS: ${err.message}</div>`;
    }
});
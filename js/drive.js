// js/drive.js
import { showToast } from './utils.js';

let tokenClient = null;
let accessToken = null;
let initRetryCount = 0;

export function initTokenClient(clientId) {
    if (!window.google) {
        if (initRetryCount < 10) { // Réessaie pendant 5 secondes max
            initRetryCount++;
            console.log(`[Drive] Google API pas encore chargée. Tentative ${initRetryCount}...`);
            setTimeout(() => initTokenClient(clientId), 500);
        } else {
            console.error("[Drive] Impossible de charger l'API Google.");
            showToast("Erreur: API Google non chargée. Vérifiez votre connexion.", "error");
        }
        return;
    }
    
    try {
        tokenClient = google.accounts.oauth2.initTokenClient({
            client_id: clientId,
            scope: 'https://www.googleapis.com/auth/drive.file',
            callback: (tokenResponse) => {
                if (tokenResponse && tokenResponse.access_token) {
                    accessToken = tokenResponse.access_token;
                    showToast("Connecté à Google Drive", "success");
                    document.dispatchEvent(new CustomEvent('drive-connected'));
                }
            },
        });
        console.log("[Drive] Client initialisé avec succès.");
    } catch (e) {
        console.error("[Drive] Erreur d'initialisation:", e);
    }
}

export function login() {
    if (!tokenClient) {
        // Tentative de récupération désespérée si l'init a raté avant
        const storedId = localStorage.getItem('google_client_id');
        if (storedId && window.google) {
            initTokenClient(storedId);
            setTimeout(() => { if(tokenClient) tokenClient.requestAccessToken({prompt: ''}); }, 500);
        } else {
            showToast("Veuillez vérifier votre Client ID dans les paramètres", "error");
        }
        return;
    }
    tokenClient.requestAccessToken({prompt: ''});
}

export function isConnected() {
    return !!accessToken;
}

export async function listFolders() {
    if (!accessToken) return [];
    try {
        const q = "mimeType = 'application/vnd.google-apps.folder' and trashed = false";
        const res = await fetch(`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id,name)`, {
            headers: { 'Authorization': 'Bearer ' + accessToken }
        });
        const data = await res.json();
        return data.files || [];
    } catch (e) {
        console.error(e);
        showToast("Erreur listing dossiers", "error");
        return [];
    }
}

export async function createAppFolder(folderName = "F.O.R.G.E. - Sauvegarde des Projets") {
    if (!accessToken) return null;
    try {
        const metadata = { name: folderName, mimeType: 'application/vnd.google-apps.folder' };
        const res = await fetch('https://www.googleapis.com/drive/v3/files', {
            method: 'POST',
            headers: { 'Authorization': 'Bearer ' + accessToken, 'Content-Type': 'application/json' },
            body: JSON.stringify(metadata)
        });
        return await res.json();
    } catch (e) {
        console.error(e);
        return null;
    }
}

export async function saveFile(data, filename, parentFolderId = null) {
    if (!accessToken) { showToast("Non connecté à Drive", "error"); return; }
    showToast("Sauvegarde en cours...");

    const metadata = { name: filename, mimeType: 'application/json' };
    if (parentFolderId) metadata.parents = [parentFolderId];

    const form = new FormData();
    form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    form.append('file', new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));

    try {
        const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
            method: 'POST',
            headers: { 'Authorization': 'Bearer ' + accessToken },
            body: form
        });
        const json = await res.json();
        if (json.id) showToast("Sauvegardé !", "success");
        else throw new Error("Erreur réponse API");
    } catch (e) {
        console.error(e);
        showToast("Erreur sauvegarde", "error");
    }
}

export async function listJsonFiles() {
    if (!accessToken) return [];
    try {
        const q = "mimeType = 'application/json' and trashed = false";
        const res = await fetch(`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id,name,modifiedTime)`, {
            headers: { 'Authorization': 'Bearer ' + accessToken }
        });
        const data = await res.json();
        return data.files || [];
    } catch (e) { return []; }
}

export async function loadFileContent(fileId) {
    if (!accessToken) return null;
    try {
        const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
            headers: { 'Authorization': 'Bearer ' + accessToken }
        });
        return await res.json();
    } catch (e) { showToast("Erreur chargement", "error"); return null; }
}
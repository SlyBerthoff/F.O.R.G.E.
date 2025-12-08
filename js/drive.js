// js/drive.js
import { showToast } from './utils.js';

let tokenClient = null;
let accessToken = null;

// Initialisation du client GIS
export function initTokenClient(clientId) {
    if (!window.google) return;
    
    // On utilise le scope drive.file qui permet de voir/créer des fichiers et dossiers gérés par l'app
    tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: 'https://www.googleapis.com/auth/drive.file',
        callback: (tokenResponse) => {
            if (tokenResponse && tokenResponse.access_token) {
                accessToken = tokenResponse.access_token;
                showToast("Connecté à Google Drive", "success");
                // Déclencher un événement custom pour mettre à jour l'UI
                document.dispatchEvent(new CustomEvent('drive-connected'));
            }
        },
    });
}

// Déclenche la popup de login
export function login() {
    if (!tokenClient) {
        showToast("Veuillez d'abord entrer votre Client ID", "error");
        return;
    }
    // Demande le token. Prompt='consent' pour forcer si besoin, sinon laisser vide pour auto-login si cookie présent
    tokenClient.requestAccessToken({prompt: ''});
}

export function isConnected() {
    return !!accessToken;
}

// --- Gestion des Dossiers ---

// Liste les dossiers accessibles (créés par l'app ou sélectionnés via picker)
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

// Crée un dossier spécifique pour l'app
export async function createAppFolder(folderName = "CustomGem Projects") {
    if (!accessToken) return null;
    try {
        const metadata = {
            name: folderName,
            mimeType: 'application/vnd.google-apps.folder'
        };
        
        const res = await fetch('https://www.googleapis.com/drive/v3/files', {
            method: 'POST',
            headers: { 
                'Authorization': 'Bearer ' + accessToken,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(metadata)
        });
        const data = await res.json();
        return data; // {id, name, ...}
    } catch (e) {
        console.error(e);
        showToast("Impossible de créer le dossier", "error");
        return null;
    }
}

// --- Gestion des Fichiers ---

// Sauvegarde dans un dossier parent spécifique (ou root par défaut)
export async function saveFile(data, filename, parentFolderId = null) {
    if (!accessToken) {
        showToast("Non connecté à Google Drive", "error");
        return;
    }
    showToast("Sauvegarde en cours...");

    const fileContent = JSON.stringify(data, null, 2);
    const metadata = {
        name: filename,
        mimeType: 'application/json',
    };
    
    // Si un dossier parent est défini, on l'ajoute
    if (parentFolderId) {
        metadata.parents = [parentFolderId];
    }

    const form = new FormData();
    form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    form.append('file', new Blob([fileContent], { type: 'application/json' }));

    try {
        const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
            method: 'POST',
            headers: { 'Authorization': 'Bearer ' + accessToken },
            body: form
        });
        const resData = await res.json();
        if (resData.id) showToast("Fichier sauvegardé !", "success");
        else throw new Error("Erreur API");
    } catch (e) {
        console.error(e);
        showToast("Erreur lors de la sauvegarde", "error");
    }
}

export async function listJsonFiles() {
    if (!accessToken) return [];
    try {
        // Cherche tous les JSON (dans n'importe quel dossier visible)
        const q = "mimeType = 'application/json' and trashed = false";
        const res = await fetch(`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id,name,modifiedTime)`, {
            headers: { 'Authorization': 'Bearer ' + accessToken }
        });
        const data = await res.json();
        return data.files || [];
    } catch (e) {
        return [];
    }
}

export async function loadFileContent(fileId) {
    if (!accessToken) return null;
    try {
        const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
            headers: { 'Authorization': 'Bearer ' + accessToken }
        });
        return await res.json();
    } catch (e) {
        showToast("Erreur lecture fichier", "error");
        return null;
    }
}
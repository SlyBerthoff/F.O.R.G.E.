// js/drive.js
import { showToast } from './utils.js';

let tokenClient = null;

export function initDrive() {
    // Initialisation différée si besoin
    const clientId = localStorage.getItem('google_client_id');
    if (clientId && window.google) {
        initializeGis(clientId);
    }
}

function initializeGis(clientId) {
    tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: 'https://www.googleapis.com/auth/drive.file',
        callback: '', // Défini lors de la demande
    });
}

export function updateClientId(newClientId) {
    if (newClientId) {
        localStorage.setItem('google_client_id', newClientId);
        initializeGis(newClientId);
    } else {
        localStorage.removeItem('google_client_id');
        tokenClient = null;
    }
}

async function handleAuth(callback) {
    const clientId = localStorage.getItem('google_client_id');
    if (!clientId) { 
        showToast("Veuillez configurer votre Google Client ID (⚙️)", "error"); 
        return; 
    }
    
    if (!tokenClient) initializeGis(clientId);
    
    tokenClient.callback = async (resp) => {
        if (resp.error) { 
            showToast("Erreur d'authentification", "error"); 
            throw resp; 
        }
        await callback(resp.access_token);
    };

    // Si on a un token valide dans gapi (cas rare ici car on utilise REST), on skip
    // Mais pour GIS simple, on demande toujours ou on laisse le browser gérer le cookie session
    tokenClient.requestAccessToken({prompt: ''}); // Essayez sans prompt d'abord
}

export function saveFileToDrive(data, filename) {
    handleAuth(async (token) => {
        showToast("Sauvegarde vers Drive en cours...");
        
        const fileContent = JSON.stringify(data, null, 2);
        const metadata = {
            name: filename,
            mimeType: 'application/json',
        };
        
        const form = new FormData();
        form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
        form.append('file', new Blob([fileContent], { type: 'application/json' }));

        try {
            const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
                method: 'POST',
                headers: new Headers({ 'Authorization': 'Bearer ' + token }),
                body: form
            });
            const resData = await response.json();
            if (resData.id) showToast(`Sauvegardé ! (ID: ${resData.id})`, "success");
            else throw new Error("Réponse Drive invalide");
        } catch (e) {
            console.error(e);
            showToast("Erreur lors de la sauvegarde Drive", "error");
        }
    });
}

export function listDriveFiles(callback) {
    handleAuth(async (token) => {
        try {
            const q = "mimeType = 'application/json' and trashed = false";
            const response = await fetch(`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id,name,modifiedTime)`, {
                headers: { 'Authorization': 'Bearer ' + token }
            });
            const data = await response.json();
            callback(data.files || []);
        } catch (e) {
            console.error(e);
            showToast("Erreur lors du listing des fichiers", "error");
            callback(null);
        }
    });
}

export function loadFileContent(fileId, callback) {
    handleAuth(async (token) => {
        showToast("Téléchargement du fichier...");
        try {
            const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
                headers: { 'Authorization': 'Bearer ' + token }
            });
            const data = await response.json();
            callback(data);
            showToast("Fichier chargé !", "success");
        } catch (e) {
            console.error(e);
            showToast("Erreur lors de la lecture du fichier", "error");
        }
    });
}
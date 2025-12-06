// js/utils.js

export function getTimestamp() {
    const now = new Date();
    return `${String(now.getDate()).padStart(2,'0')}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getFullYear()).slice(-2)}-${String(now.getHours()).padStart(2,'0')}${String(now.getMinutes()).padStart(2,'0')}`;
}

export function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<span>${message}</span>`;
    container.appendChild(toast);
    setTimeout(() => {
        toast.style.animation = 'fadeOut 0.3s ease-out forwards';
        toast.addEventListener('animationend', () => toast.remove());
    }, 3000);
}

export async function retryFetch(url, options, retries = 3, delay = 1000) {
    try {
        const response = await fetch(url, options);
        if (!response.ok) {
            if (response.status === 429 && retries > 0) {
                await new Promise(res => setTimeout(res, delay));
                return retryFetch(url, options, retries - 1, delay * 2);
            }
            throw new Error(`Erreur HTTP: ${response.status}`);
        }
        return response.json();
    } catch (error) {
        if (retries > 0) {
            await new Promise(res => setTimeout(res, delay));
            return retryFetch(url, options, retries - 1, delay * 2);
        }
        throw error;
    }
}
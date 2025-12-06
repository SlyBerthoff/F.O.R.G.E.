// js/gemini.js
import { showToast, retryFetch } from './utils.js';

export async function callGemini(systemPrompt, userPrompt, jsonSchema = null) {
    let effectiveKey = localStorage.getItem('gemini_api_key');
    if (!effectiveKey) { 
        showToast("Veuillez configurer votre clé API Gemini (⚙️).", "error"); 
        return null; 
    }
    
    // Modèle flash pour la réactivité
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${effectiveKey}`;
    
    const payload = {
        contents: [{ parts: [{ text: userPrompt }] }],
        systemInstruction: { parts: [{ text: systemPrompt }] }
    };
    if (jsonSchema) payload.generationConfig = { responseMimeType: "application/json", responseSchema: jsonSchema };

    try {
        const result = await retryFetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        return result.candidates?.[0]?.content?.parts?.[0]?.text || null;
    } catch (error) {
        console.error(error); 
        showToast(`Erreur IA: ${error.message}`, 'error'); 
        return null;
    }
}

// Logique pour la reformulation d'un bloc spécifique
export async function handleReformulateLogic(editor, mainTitle, pillarTitle, subTitle) {
    const currentText = editor.value();
    
    // Manipulation DOM locale pour le spinner sur l'éditeur
    const cmWrapper = editor.codemirror.getWrapperElement();
    const originalOpacity = cmWrapper.style.opacity;
    cmWrapper.style.opacity = '0.5'; cmWrapper.style.pointerEvents = 'none';
    
    let spinner = document.createElement('div');
    spinner.className = 'absolute inset-0 flex items-center justify-center z-10';
    spinner.innerHTML = '<div class="gemini-spinner text-purple-600" style="width:2rem;height:2rem;border-width:3px;"></div>';
    cmWrapper.parentElement.style.position = 'relative';
    cmWrapper.parentElement.appendChild(spinner);

    let sys = "Tu es un expert en rédaction de prompts pour LLM.";
    let prompt = `Contexte:\nTitre: "${mainTitle}"\nPilier: "${pillarTitle}"\nSection: "${subTitle}"\n\n`;
    
    if (!currentText || currentText.trim() === "") {
        sys += " Rédige un contenu pertinent et concis.";
        prompt += "Instruction: Rédige un premier jet. Donne uniquement le contenu.";
    } else {
        sys += " Réécris le texte pour qu'il soit plus clair et structuré.";
        prompt += `Texte à reformuler:\n"${currentText}"\n\nDonne uniquement le texte reformulé.`;
    }

    try {
        const finalText = await callGemini(sys, prompt);
        return finalText;
    } finally {
        cmWrapper.style.opacity = originalOpacity || '1';
        cmWrapper.style.pointerEvents = 'auto';
        spinner.remove();
    }
}
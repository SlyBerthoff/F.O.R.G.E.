// js/config.js

// Map globale pour stocker les instances d'éditeurs par ID
export const mdeInstances = new Map();

export const colorSets = [
    { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-300', ring: 'focus:ring-blue-400', easymdeBg: '#EFF6FF', printBg: '#EFF6FF', printText: '#1E40AF' },
    { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-300', ring: 'focus:ring-green-400', easymdeBg: '#ECFDF5', printBg: '#ECFDF5', printText: '#166534' },
    { bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-300', ring: 'focus:ring-yellow-400', easymdeBg: '#FEFCE8', printBg: '#FEFCE8', printText: '#854D0E' },
    { bg: 'bg-purple-100', text: 'text-purple-800', border: 'border-purple-300', ring: 'focus:ring-purple-400', easymdeBg: '#F5F3FF', printBg: '#F5F3FF', printText: '#5B21B6' },
    { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-300', ring: 'focus:ring-red-400', easymdeBg: '#FEF2F2', printBg: '#FEF2F2', printText: '#991B1B' },
    { bg: 'bg-indigo-100', text: 'text-indigo-800', border: 'border-indigo-300', ring: 'focus:ring-indigo-400', easymdeBg: '#EEF2FF', printBg: '#EEF2FF', printText: '#3730A3' }
];

let currentColorIndex = 0;

export function getNextColorSet() {
    const color = colorSets[currentColorIndex];
    currentColorIndex = (currentColorIndex + 1) % colorSets.length;
    return color;
}

export function resetColorIndex() {
    currentColorIndex = 0;
}
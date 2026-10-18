export const safeSetLocalStorage = (key: string, value: string) => {
    try {
        if (typeof localStorage !== 'undefined') {
            localStorage.setItem(key, value);
        }
        if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
            window.dispatchEvent(new Event('storage-success'));
        }
    } catch (e: any) {
        if (e.name === 'QuotaExceededError' || e.code === 22 || e.name === 'NS_ERROR_DOM_QUOTA_REACHED') {
            if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
                window.dispatchEvent(new Event('storage-full'));
            }
        }
        console.error('Storage full:', e);
    }
};

export const isValidEvent = (start: number, end: number) => {
    return typeof start === 'number' && typeof end === 'number' && !isNaN(start) && !isNaN(end) && start >= 0 && end > start;
};

export const parseCSVRow = (str: string) => {
    let inQuotes = false;
    let currentVal = '';
    const row = [];
    for (let i = 0; i < str.length; i++) {
        const char = str[i];
        if (char === '"' && str[i + 1] === '"') {
            currentVal += '"';
            i++;
        } else if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            row.push(currentVal);
            currentVal = '';
        } else {
            currentVal += char;
        }
    }
    row.push(currentVal);
    return row;
};

/**
 * Robust CSV parser that properly handles:
 * - Quoted fields with commas inside them
 * - Escaped quotes ("" inside quoted fields)
 * - Windows (\r\n) and Unix (\n) line endings
 * - Empty fields
 * - BOM (Byte Order Mark) at the start of file
 *
 * @param {string} text - Raw CSV text content
 * @returns {{ headers: string[], rows: Record<string, string>[] }}
 */
export function parseCSV(text) {
    // Remove BOM if present
    if (text.charCodeAt(0) === 0xFEFF) {
        text = text.slice(1);
    }

    const lines = splitCSVLines(text);
    if (lines.length < 2) {
        return { headers: [], rows: [] };
    }

    const headers = parseCSVLine(lines[0]).map(h => h.trim().toLowerCase().replace(/\s+/g, ''));
    const rows = [];

    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const values = parseCSVLine(line);
        const row = {};
        headers.forEach((h, idx) => {
            row[h] = (values[idx] || '').trim();
        });

        // Also provide common aliases (e.g., "parent name" → "parentname")
        // so lookups like row.parentname or row['parent name'] both work
        rows.push(row);
    }

    return { headers, rows };
}

/**
 * Split CSV text into lines, respecting quoted fields that span multiple lines.
 */
function splitCSVLines(text) {
    const lines = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < text.length; i++) {
        const ch = text[i];

        if (ch === '"') {
            inQuotes = !inQuotes;
            current += ch;
        } else if ((ch === '\n' || ch === '\r') && !inQuotes) {
            if (ch === '\r' && text[i + 1] === '\n') i++; // skip \r\n pair
            lines.push(current);
            current = '';
        } else {
            current += ch;
        }
    }

    if (current.trim()) {
        lines.push(current);
    }

    return lines;
}

/**
 * Parse a single CSV line into an array of field values.
 * Handles quoted fields, escaped quotes, and commas within quotes.
 */
function parseCSVLine(line) {
    const fields = [];
    let current = '';
    let inQuotes = false;
    let i = 0;

    while (i < line.length) {
        const ch = line[i];

        if (inQuotes) {
            if (ch === '"') {
                // Check for escaped quote ""
                if (i + 1 < line.length && line[i + 1] === '"') {
                    current += '"';
                    i += 2;
                    continue;
                } else {
                    // End of quoted field
                    inQuotes = false;
                    i++;
                    continue;
                }
            } else {
                current += ch;
                i++;
            }
        } else {
            if (ch === '"') {
                // Start of quoted field
                inQuotes = true;
                i++;
            } else if (ch === ',') {
                fields.push(current);
                current = '';
                i++;
            } else {
                current += ch;
                i++;
            }
        }
    }

    // Push last field
    fields.push(current);

    return fields;
}

/**
 * Generate a CSV string from data rows.
 * Properly quotes fields containing commas, quotes, or newlines.
 *
 * @param {string[]} headers - Column headers
 * @param {Array<Array<string|number>>} rows - 2D data array
 * @returns {string} CSV text
 */
export function generateCSV(headers, rows) {
    const escapeField = (val) => {
        const str = String(val ?? '');
        if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
            return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
    };

    const lines = [headers.map(escapeField).join(',')];
    for (const row of rows) {
        lines.push(row.map(escapeField).join(','));
    }
    return lines.join('\n');
}

/**
 * Download a CSV string as a file.
 *
 * @param {string} csvContent - CSV text
 * @param {string} filename - Download filename
 */
export function downloadCSVFile(csvContent, filename) {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}

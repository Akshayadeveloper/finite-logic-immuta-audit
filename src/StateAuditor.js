
const crypto = require('crypto');

/**
 * Creates a stable SHA256 hash signature for any JavaScript object.
 * Keys in nested objects are sorted to ensure the hash is deterministic.
 * @param {any} data The object or primitive to hash.
 * @returns {string} The SHA256 hash.
 */
function deepHash(data) {
    // Handle primitives (number, string, boolean, null, undefined)
    if (typeof data !== 'object' || data === null) {
        // Use a stable representation for primitives
        return crypto.createHash('sha256').update(String(data || 'null')).digest('hex');
    }

    // Handle Arrays (ordered)
    if (Array.isArray(data)) {
        const hashedItems = data.map(deepHash).join('|');
        return crypto.createHash('sha256').update(`[${hashedItems}]`).digest('hex');
    }

    // Handle Objects (unordered - MUST sort keys)
    const sortedKeys = Object.keys(data).sort();
    const hashableParts = [];

    for (const key of sortedKeys) {
        const value = data[key];
        // Concatenate key and recursively hashed value
        hashableParts.push(`${key}:${deepHash(value)}`);
    }

    // Final hash of the concatenated, sorted parts
    const finalString = `{${hashableParts.join(',')}}`;
    return crypto.createHash('sha256').update(finalString, 'utf8').digest('hex');
}

class StateAuditor {
    constructor(initialData) {
        // Deep copy the input data to ensure the auditor itself doesn't hold a reference
        this.initialData = JSON.parse(JSON.stringify(initialData));
        this.initialSignature = deepHash(this.initialData);
        console.log(`[ImmutaAudit] Initial Signature: ${this.initialSignature}`);
    }

    /**
     * Verifies the current state against the initial immutable signature.
     * @param {any} currentData The data object to check.
     * @returns {boolean} true if state integrity is maintained.
     */
    verify(currentData) {
        const currentSignature = deepHash(currentData);
        
        if (this.initialSignature === currentSignature) {
            console.log('✅ State integrity verified. Object remains immutable.');
            return true;
        } else {
            console.error('❌ IMMUTABILITY BREACH DETECTED. State signature mismatch.');
            console.log(`   Initial Hash: ${this.initialSignature}`);
            console.log(`   Current Hash: ${currentSignature}`);
            return false;
        }
    }
}

// --- Demonstration ---
const userData = { userId: 101, settings: { theme: "dark", mode: "stable" } };
const auditor = new StateAuditor(userData);

// Safe operation: Verify a copy
const copiedData = JSON.parse(JSON.stringify(userData));
auditor.verify(copiedData);

// Illegal operation: Nested mutation
userData.settings.mode = "unstable"; 
auditor.verify(userData);
module.exports = { StateAuditor, deepHash };

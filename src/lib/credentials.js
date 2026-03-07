/**
 * Credential Generation Utility
 * Auto-generates usernames and temporary passwords for new users.
 */

/**
 * Generate a username from a name and role.
 * Format: firstname.lastname (lowercase, no spaces)
 * For students: adds roll number; for teachers: adds 'tchr' prefix
 */
export function generateUsername(name, role, id) {
    const cleanName = name
        .toLowerCase()
        .replace(/[^a-z\s]/g, '')
        .trim()
        .split(/\s+/)
        .filter(Boolean);

    if (cleanName.length === 0) return `user_${id}`;

    const firstName = cleanName[0];
    const lastName = cleanName.length > 1 ? cleanName[cleanName.length - 1] : '';

    if (role === 'student') {
        return lastName ? `${firstName}.${lastName}` : `${firstName}.${id}`;
    }

    // For teachers
    return lastName ? `${firstName}.${lastName}` : `${firstName}.tchr`;
}

/**
 * Generate a temporary password.
 * Format: Role prefix + Random 6 chars + special char
 * Example: Stu@aB3x9K!
 */
export function generateTemporaryPassword(role) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const specials = '@#$!&';
    const prefix = role === 'student' ? 'Stu' : role === 'admin' ? 'Adm' : 'Tch';

    let password = prefix + specials[Math.floor(Math.random() * specials.length)];
    for (let i = 0; i < 6; i++) {
        password += chars[Math.floor(Math.random() * chars.length)];
    }
    password += specials[Math.floor(Math.random() * specials.length)];

    return password;
}

/**
 * Generate email from name and school domain.
 */
export function generateEmail(name, domain = 'school.edu') {
    const username = name
        .toLowerCase()
        .replace(/[^a-z\s]/g, '')
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .join('.');

    return `${username}@${domain}`;
}

/**
 * Create full credential package for a new user.
 */
export function createCredentials(name, role, id) {
    const username = generateUsername(name, role, id);
    const tempPassword = generateTemporaryPassword(role);
    const email = generateEmail(name);

    return {
        username,
        email,
        tempPassword,
        role,
        mustChangePassword: true,
        createdAt: new Date().toISOString(),
    };
}

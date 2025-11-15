interface UserRecord {
    index: number;
    name: string;
    password: string;
    createdAt: number;
}

export interface RegistrationResult {
    name: string;
    index?: number;
    error: boolean;
    errorText: string;
}

const users = new Map<string, UserRecord>();
let sequence = 1;

const normalizeName = (value: string): string => value.trim().toLowerCase();

const validateName = (name: string): string | null => {
    if (!name) return 'Name is required';
    if (name.length < 3) return 'Name must contain at least 3 characters';
    if (!/^[a-z0-9_]+$/i.test(name)) return 'Name must be alphanumeric or underscore';
    return null;
};

const validatePassword = (password: string): string | null => {
    if (!password) return 'Password is required';
    if (password.length < 6) return 'Password must be at least 6 characters';
    return null;
};

export const registerUser = (rawName: string, rawPassword: string): RegistrationResult => {
    const name = rawName?.trim() ?? '';
    const password = rawPassword ?? '';

    const nameError = validateName(name);
    if (nameError) {
        return { name, error: true, errorText: nameError };
    }

    const passwordError = validatePassword(password);
    if (passwordError) {
        return { name, error: true, errorText: passwordError };
    }

    const key = normalizeName(name);
    if (users.has(key)) {
        return { name, error: true, errorText: 'User already exists' };
    }

    const record: UserRecord = {
        index: sequence,
        name,
        password,
        createdAt: Date.now(),
    };

    users.set(key, record);
    sequence += 1;

    return { name, index: record.index, error: false, errorText: '' };
};

export const validateUser = (rawName: string, rawPassword: string): boolean => {
    const key = normalizeName(rawName ?? '');
    const user = users.get(key);
    return Boolean(user && user.password === rawPassword);
};

export const listUsers = (): UserRecord[] => Array.from(users.values());

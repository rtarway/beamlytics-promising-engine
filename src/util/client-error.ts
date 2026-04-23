export function clientErrorMessage(error: unknown): string {
    if (process.env.NODE_ENV === 'production') {
        return 'Internal server error';
    }
    if (error instanceof Error) {
        return error.message;
    }
    return 'Unknown error';
}

export function logServerError(label: string, error: unknown): void {
    console.error(`[${label}]`, error);
}

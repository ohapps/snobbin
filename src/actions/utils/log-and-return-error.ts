export const logAndReturnError = (message: string, error: any) => {
    console.error(message, error);
    return { success: false, message };
};
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const logAndReturnError = (message: string, error: any) => {
    console.error(message, error);
    return { success: false, message };
};
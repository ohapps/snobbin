import { z } from "zod";

export const ProfileSchema = z.object({
    email: z.string().min(1, 'First name is required').max(50, 'email must be less than or equal to 50 characters'),
    firstName: z.string().min(1, 'First name is required').max(50, 'First name must be less than or equal to 50 characters'),
    lastName: z.string().min(1, 'Last name is required').max(50, 'Last name must be less than or equal to 50 characters'),
});

export type Profile = z.infer<typeof ProfileSchema>;

export interface Snob {
    id: string;
    email: string;
    firstName?: string | null;
    lastName?: string | null;
    pictureUrl?: string | null;
}
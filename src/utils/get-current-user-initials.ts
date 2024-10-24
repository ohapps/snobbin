import { UserProfile } from "@auth0/nextjs-auth0/client";

export const getCurrentUserInitials = (userProfile?: UserProfile) => {
    if (userProfile) {
        // return ((userProfile.firstName && userProfile.lastName) ? `${userProfile.firstName?.charAt(0)}${userProfile.lastName.charAt(0)}` : userProfile.email.charAt(0)).toUpperCase();
        return userProfile.name ? userProfile.name.charAt(0).toUpperCase() : userProfile.email?.charAt(0).toUpperCase() ?? '';
    }
    return '';
}
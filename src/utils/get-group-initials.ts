import { SnobGroup } from "@/types/snobGroup";

export const getGroupInitials = (group: SnobGroup) => {
    if (group.name) {
        const words = group.name.split(' ');
        return (words.length > 1 ? `${words[0].charAt(0)}${words[1].charAt(0)}` : words[0].charAt(0)).toUpperCase();
    }
    return '';
}
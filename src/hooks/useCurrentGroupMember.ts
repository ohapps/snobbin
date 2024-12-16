'use client';

import { useUser } from "@auth0/nextjs-auth0/client";
import { SnobGroup } from "@/types/snobGroup";

const useCurrentGroupMember = (group: SnobGroup) => {
    const { user } = useUser();
    if (user) {
        return group.members.find((member) => member.snob.id === user.sub);
    }
}

export default useCurrentGroupMember;
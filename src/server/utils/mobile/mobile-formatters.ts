

export function formatGroupResponse(g: {
  id: string;
  name: string;
  description: string;
  minRanking: string | number;
  maxRanking: string | number;
  increments: string | number;
  rankIcon: string;
  rankingsRequired: string | number;
  deleted: boolean;
  pictureUrl: string | null;
}) {
  return {
    id: g.id,
    name: g.name,
    description: g.description,
    min_ranking: Number(g.minRanking),
    max_ranking: Number(g.maxRanking),
    increments: Number(g.increments),
    rank_icon: g.rankIcon,
    rankings_required: Number(g.rankingsRequired),
    deleted: g.deleted ? 1 : 0,
    picture_url: g.pictureUrl,
  };
}

export function formatMemberResponse(m: {
  id: string;
  groupId: string;
  snobId: string;
  role: string;
}) {
  return {
    id: m.id,
    group_id: m.groupId,
    snob_id: m.snobId,
    role: m.role,
  };
}

export function formatSnobResponse(s: {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  pictureUrl: string | null;
  lastGroupId: string | null;
}) {
  return {
    id: s.id,
    email: s.email,
    first_name: s.firstName,
    last_name: s.lastName,
    picture_url: s.pictureUrl,
    last_group_id: s.lastGroupId,
  };
}

export function formatAttributeResponse(a: {
  id: string;
  groupId: string;
  name: string;
}) {
  return {
    id: a.id,
    group_id: a.groupId,
    name: a.name,
  };
}

export function formatItemResponse(item: {
  id: string;
  groupId: string;
  description: string;
  ranked: boolean;
  averageRanking: string | number | null;
  imageId: string | null;
  imageUrl: string | null;
  createdDate: Date | null;
  updatedDate: Date | null;
  createdBy: string | null;
  updatedBy: string | null;
}) {
  return {
    id: item.id,
    group_id: item.groupId,
    description: item.description,
    ranked: item.ranked ? 1 : 0,
    average_ranking: item.averageRanking ? Number(item.averageRanking) : null,
    image_id: item.imageId,
    image_url: item.imageUrl,
    created_date: item.createdDate?.toISOString() ?? null,
    updated_date: item.updatedDate?.toISOString() ?? null,
    created_by: item.createdBy,
    updated_by: item.updatedBy,
  };
}

export function formatItemAttributeResponse(ia: {
  id: string;
  itemId: string;
  attributeId: string;
  attributeValue: string;
}) {
  return {
    id: ia.id,
    item_id: ia.itemId,
    attribute_id: ia.attributeId,
    attribute_value: ia.attributeValue,
  };
}

export function formatRankingResponse(r: {
  id: string;
  itemId: string;
  groupMemberId: string;
  ranking: string | number;
  notes: string | null;
  createdDate: Date | null;
  updatedDate: Date | null;
}) {
  return {
    id: r.id,
    item_id: r.itemId,
    group_member_id: r.groupMemberId,
    ranking: Number(r.ranking),
    notes: r.notes,
    created_date: r.createdDate?.toISOString() ?? null,
    updated_date: r.updatedDate?.toISOString() ?? null,
  };
}

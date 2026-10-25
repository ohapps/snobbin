/**
 * Wire format for the offline sync endpoints.
 *
 * These mirror the existing `/api/mobile/*` snake_case responses
 * (`src/server/utils/mobile/mobile-formatters.ts`) so the browser can reuse the
 * same data contract. See `docs/OFFLINE_PLAN.md` §5.
 */

export interface ApiGroup {
  id: string;
  name: string;
  description: string;
  min_ranking: number;
  max_ranking: number;
  increments: number;
  rank_icon: string;
  rankings_required: number;
  deleted: 0 | 1;
  picture_url: string | null;
}

export interface ApiSnob {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  picture_url: string | null;
  last_group_id: string | null;
  is_premium: 0 | 1;
}

export interface ApiMember {
  id: string;
  group_id: string;
  snob_id: string;
  role: string;
}

export interface ApiInvite {
  id: string;
  group_id: string;
  email: string;
  status: string;
}

export interface ApiAttribute {
  id: string;
  group_id: string;
  name: string;
}

export interface ApiItem {
  id: string;
  group_id: string;
  description: string;
  ranked: 0 | 1;
  average_ranking: number | null;
  image_id: string | null;
  image_url: string | null;
  created_date: string | null;
  updated_date: string | null;
  created_by: string | null;
  updated_by: string | null;
}

export interface ApiItemAttribute {
  id: string;
  item_id: string;
  attribute_id: string;
  attribute_value: string;
}

export interface ApiRanking {
  id: string;
  item_id: string;
  group_member_id: string;
  ranking: number;
  notes: string | null;
  created_date: string | null;
  updated_date: string | null;
}

/** `GET /api/offline/bootstrap` */
export interface BootstrapResponse {
  snob: ApiSnob;
  groups: ApiGroup[];
  memberships: ApiMember[];
  snobs: ApiSnob[];
}

/** `GET /api/offline/groups/:groupId/meta` */
export interface GroupMetaResponse {
  group: ApiGroup;
  members: ApiMember[];
  snobs: ApiSnob[];
  attributes: ApiAttribute[];
  invites: ApiInvite[];
  totalItems: number;
}

/** `GET /api/offline/groups/:groupId/items?page=N` */
export interface GroupItemsPageResponse {
  items: ApiItem[];
  itemAttributes: ApiItemAttribute[];
  rankings: ApiRanking[];
  page: number;
  pageSize: number;
  total: number;
  /** True when this is the last page. */
  complete: boolean;
}

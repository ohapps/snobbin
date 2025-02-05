https://app.quickdatabasediagrams.com/#/

```
# Modify this code to update the DB schema diagram.
# To reset the sample schema, replace everything with
# two dots ('..' - without quotes).

Snobs
-
id PK text
email text UNIQUE
first_name NULL text
last_name NULL text
picture_url NULL text

SnobGroups
-
id PK UUID
name text
description text
min_ranking numeric
max_ranking numeric
increments numeric
rank_icon text
rankings_required numeric
deleted bool

SnobGroupMembers
-
id PK UUID
group_id UUID FK >- SnobGroups.id
snob_id text FK >- Snobs.id
role text

SnobGroupAttributes
-
id PK UUID
group_id UUID FK >- SnobGroups.id
name text

SnobGroupInvites
-
id PK UUID
group_id UUID FK >- SnobGroups.id
email text
status text

RankingItems
-
id PK UUID
group_id UUID FK >- SnobGroups.id
description text
ranked bool
averageRanking numeric NULL
image_id text NULL
image_url text NULL

RankingItemAttributes
-
id PK UUID
item_id UUID FK >- RankingItems.id
attribute_id UUID FK >- SnobGroupAttributes.id
attribute_value text

Rankings
-
id PK UUID
item_id UUID FK >- RankingItems.id
group_member_id UUID FK >- SnobGroupMembers.id
ranking numeric
notes text NULL
```

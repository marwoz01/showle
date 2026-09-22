# Friends, follows and movie activity

The Friends tab in `/profile` is the entry point for finding public profiles, following people, accepting friend invitations and viewing movie activity. Existing navigation stays in place. Public profile cards also expose the available relationship actions.

Following is one-way and available for public profiles. Friendship requires a request and explicit acceptance. Users can share their profile invitation link/code without making their profile public; the invitation exposes only the identity needed to recognize the person. Pending requests do not grant access to a private profile's statistics or movies. Sending requests in both directions does not silently accept a friendship.

Accepted friends can view each other's movie profile and aggregate statistics. Removing a friend removes that access unless the profile is public. A saved follow does not grant access after the followed person makes their profile private.

Movie activity has a separate visibility setting:

- **Only me:** activity stays private.
- **Friends:** accepted friends can see it; this is the default.
- **Public:** activity is public only when the profile itself is public; otherwise it remains available to accepted friends.

Activity describes films marked as watched and their ratings. It is not a live streaming status. Watchlists, written reviews, email addresses and taste preferences are not exposed through the social feed. The activity list reflects the current collection, so removing a film or moving it back to the watchlist removes it from shared activity.

Social APIs use the authenticated account as the acting user and public profile slugs for targets. They never accept a client-supplied acting user ID. Relationship changes run transactionally; incoming requests can only be accepted or declined by their recipient. Exports include account relationships, and deleting Showle data removes incoming and outgoing relationships through cascading foreign keys.

`prisma/migrations/20260922_social_profiles/migration.sql` adds the activity visibility setting, `UserFollow` and `UserFriendship`. The migration was tested through Prisma against isolated PostgreSQL, then applied transactionally to the configured application database on 2026-09-22. Its ten new columns, four cascading foreign keys and visibility constraint were verified. No user relationships were created by the migration.

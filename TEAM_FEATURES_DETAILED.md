# Team Features - Detailed Implementation Guide

## 1. Scope

This document describes the currently implemented Team features in the IDEA web app across frontend, backend API, data model, permissions, and user flows.

It reflects implementation present in:
- Frontend team management UI
- Backend team service and routes
- Team-aware project access behavior
- Invite + signup integration

## 2. Feature Summary

The app supports full team lifecycle operations:

1. Create a team (single owner)
2. View your current team and members
3. Invite users by email with role assignment (editor/viewer)
4. Accept invite via token
5. Accept invite during signup for new users
6. Change member role (owner only)
7. Remove member (owner only)
8. Leave team (non-owner members)
9. Delete team (owner only)
10. Team-aware project collaboration (read/write behavior based on team role)

## 3. Team Roles and Permission Model

### Roles

- owner
- editor
- viewer

### Team-level permissions

| Action | Owner | Editor | Viewer |
|---|---|---|---|
| Create team | Yes | Yes (if not already in a team) | Yes (if not already in a team) |
| Invite members | Yes | No | No |
| Change member role | Yes | No | No |
| Remove member | Yes | No | No |
| Leave team | No (blocked) | Yes | Yes |
| Delete team | Yes | No | No |

### Project-level permissions (team context)

If a user belongs to the same team as a project:

- owner role on project if they are project creator
- editor role if their teamRole is editor
- viewer role if their teamRole is viewer

Derived access capability:

| Capability | Owner | Editor | Viewer |
|---|---|---|---|
| Read project | Yes | Yes | Yes |
| Modify files / chat history / restore version | Yes | Yes | No |
| Deploy (via canDeploy) | Yes | Yes | No |
| Delete project | Yes | No | No |
| Publish/unpublish template | Yes | No | No |

## 4. Data Model

## Team collection

Each Team document stores:

- name
- ownerId (PlatformUser reference)
- members[]
  - userId
  - role: owner | editor | viewer
  - joinedAt
- invites[]
  - email
  - role: editor | viewer
  - token
  - expiresAt
  - createdAt
- plan (default: team)
- createdAt / updatedAt

## PlatformUser additions for teams

Each user stores:

- teamId (Team reference, nullable)
- teamRole (owner | editor | viewer | null)

## PlatformProject team link

Each project stores:

- teamId (Team reference, nullable)

This is what enables team-shared project visibility and permission checks.

## 5. API Endpoints

Base path: /api/platform/teams
All endpoints require authenticated user.

### 5.1 Create Team

- Method: POST /
- Body: { name }
- Behavior:
  - Fails if user already has teamId
  - Creates team with creator as member role owner
  - Updates user teamId + teamRole=owner

### 5.2 Get My Team

- Method: GET /my-team
- Behavior:
  - Returns team=null if user has no team
  - Otherwise returns team object + expanded member list (email/name/avatar)

### 5.3 Invite Member

- Method: POST /invite
- Body: { email, role }
- Role allowed in body: editor | viewer
- Behavior:
  - Owner-only action
  - Validates email format
  - Creates invite token (16-byte random hex)
  - Invite expiration: 7 days
  - Sends email if SMTP configured
  - Returns invite URLs and status

Response data includes:
- inviteUrl (for existing users)
- signupInviteUrl (for new users)
- emailSent
- emailError
- expiresAt
- token in non-production only

### 5.4 Accept Invite

- Method: POST /accept-invite
- Body: { token }
- Behavior:
  - Normalizes token input (handles full URL or query strings)
  - Verifies token exists and not expired
  - Enforces invited email must match logged-in user email
  - Adds user to team with invited role
  - Removes consumed invite
  - Updates PlatformUser teamId/teamRole

Idempotent branch:
- If token is invalid/expired but user already belongs to any team, returns alreadyMember=true response instead of hard failure.

### 5.5 Remove Member

- Method: DELETE /members/:targetUserId
- Behavior:
  - Owner-only
  - Owner cannot remove themselves
  - Removes member from team.members
  - Clears target user teamId/teamRole

### 5.6 Update Member Role

- Method: PATCH /members/:targetUserId/role
- Body: { role }
- Allowed role values: editor | viewer
- Behavior:
  - Owner-only
  - Owner role cannot be changed
  - Updates both team member role and target user teamRole

### 5.7 Leave Team

- Method: POST /leave
- Behavior:
  - Non-owner members can leave
  - Owner is blocked from leaving directly
  - Removes membership and clears user team fields

### 5.8 Delete Team

- Method: DELETE /
- Behavior:
  - Owner-only
  - Clears teamId/teamRole for all members
  - Deletes team document

## 6. Frontend Team Page Capabilities

Page route: /team
Protected route: requires auth

When user has a team:

1. Displays team name and member count
2. Displays member list with role labels
3. Owner can:
   - invite member with role selector
   - copy invite link
   - copy signup invite link
   - copy token
   - change editor/viewer role via dropdown
   - remove member
4. Non-owner sees Leave Team in danger zone
5. Owner sees Delete Team in danger zone

When user has no team:

1. Create Team panel with team name input
2. Join Team panel with invite token input
3. Token can auto-fill from query parameter token

## 7. Invite Token Robustness

Both frontend and backend normalize invite token input to reduce user friction:

- Handles direct token paste
- Handles full URL paste
- Handles query-string paste (?token=...)
- Handles inviteToken and token query key variants
- Trims quotes/trailing punctuation
- Decodes URL-encoded input safely

This helps users join successfully even when token is copied from messages or wrapped links.

## 8. Signup Integration for Invited New Users

Signup page supports team invite onboarding:

- Reads inviteToken (or token) from URL
- Reads prefilled email from URL
- On register, passes inviteToken to backend auth service
- Backend creates user first, then immediately attempts invite acceptance

Outcome:
- New user can be auto-added to team during account creation.

## 9. Email Delivery Behavior

Invite email sending is attempted using SMTP settings.

If SMTP is configured:
- Invite email is sent with two links:
  - direct team join link for existing users
  - signup invite link for new users

If SMTP is not configured or send fails:
- Invite is still created
- API returns emailSent=false and reason
- Frontend informs owner to share links manually

## 10. Team-Aware Project Collaboration

Projects are team-scoped automatically on create/clone:

- New project teamId is set from current user teamId
- Cloned template project teamId is set from current user teamId

Project listing and access:

- User sees own projects
- If user has teamId, also sees projects with same teamId
- Access role is derived from ownership or teamRole

Permission enforcement in project service:

- Write operations require owner/editor
- Delete and publish require owner
- Viewer can read but cannot modify

Backward compatibility behavior:

- If older project has missing teamId but owner belongs to same team as requester, service backfills project.teamId automatically.

## 11. Key Error Cases and Guards

Current guards include:

- Cannot create team when already in team
- Invite restricted to owner
- Invalid email blocked for invites
- Invite token required for accept
- Invite must match target email
- Cannot join if already in another team
- Cannot remove owner self
- Cannot change owner role
- Owner cannot leave team
- Team delete restricted to owner

## 12. UX Messages and States

The team page includes explicit status handling:

- Loading state on team fetch
- Inline error banner for failures
- Invite success/failure messaging
- Join success message with already-member branch
- Action button disabled states during async operations
- Clipboard copy feedback

## 13. Security and Access Notes

- All team routes are protected by auth middleware.
- Team owner checks are enforced server-side, not only in UI.
- Project access checks are centralized in service layer.
- Team invite token visibility is restricted in production responses.

## 14. Environment Dependencies

Core team feature works without SMTP.

For email delivery, configure SMTP env vars:

- SMTP_HOST
- SMTP_PORT
- SMTP_USER
- SMTP_PASS (or SMTP_PASSWORD)
- SMTP_FROM
- SMTP_SECURE (optional)

Fallback aliases are supported (EMAIL_* env variants).

## 15. Current Limitations and Next-Phase Opportunities

The current implementation does not yet include:

1. Ownership transfer flow
2. Invite revocation endpoint
3. Pending invites UI list
4. Role-specific UI behavior beyond owner management controls
5. Team audit logs
6. Team-specific billing controls from team page
7. Cross-team project transfer

These can be added as Phase 2 collaboration improvements.

## 16. End-to-End Example Flows

### Flow A: Existing user invited and joins

1. Owner invites editor/viewer by email.
2. Invite link is generated.
3. Existing user opens /team?token=...
4. User clicks Join.
5. Backend validates token + email match.
6. Member added to team, user team fields updated.
7. User now sees team projects according to role.

### Flow B: New user invited and signs up

1. Owner invites email not yet registered.
2. Owner shares signup invite URL.
3. User opens /signup?inviteToken=...&email=...
4. Signup form pre-fills email and detects invite.
5. Registration succeeds.
6. Backend auto-accepts invite after user creation.
7. User lands in app as team member.

### Flow C: Owner removes member

1. Owner opens member list.
2. Owner clicks Remove on target member.
3. Backend removes member from team.
4. Target user teamId/teamRole are cleared.
5. Removed user no longer has team-scoped project access.

## 17. Implementation Files (Reference)

Frontend:
- frontend/pages/team.tsx
- frontend/pages/signup.tsx
- frontend/contexts/AuthContext.tsx

Backend:
- backend/src/modules/teams/team.routes.ts
- backend/src/modules/teams/team.service.ts
- backend/src/modules/teams/team.model.ts
- backend/src/modules/platform-auth/platform-auth.service.ts
- backend/src/modules/platform-auth/platform-user.model.ts
- backend/src/modules/platform-projects/platform-projects.service.ts
- backend/src/modules/platform-projects/platform-project.model.ts
- backend/src/server.ts
- backend/src/utils/mailer.ts

---

Last updated: 2026-03-24
Source of truth: current code implementation in this repository.

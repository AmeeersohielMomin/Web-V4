import { randomBytes } from 'crypto';
import { Team } from './team.model';
import { PlatformUser } from '../platform-auth/platform-user.model';
import { sendTeamInviteEmail } from '../../utils/mailer';

function normalizeInviteTokenInput(rawValue: string): string {
  let value = String(rawValue || '').trim().replace(/^['\"]|['\"]$/g, '');
  if (!value) return '';

  try {
    value = decodeURIComponent(value);
  } catch {
    // Keep original value if decode fails.
  }

  const extractFromParams = (input: string) => {
    const query = input.startsWith('?') ? input.slice(1) : input;
    const params = new URLSearchParams(query);
    return String(params.get('token') || params.get('inviteToken') || '').trim();
  };

  if (value.includes('://')) {
    try {
      const parsed = new URL(value);
      const extracted = String(parsed.searchParams.get('token') || parsed.searchParams.get('inviteToken') || '').trim();
      if (extracted) value = extracted;
    } catch {
      // Fall back to direct parsing.
    }
  }

  if (value.startsWith('?') || value.includes('token=') || value.includes('inviteToken=')) {
    const extracted = extractFromParams(value);
    if (extracted) value = extracted;
  }

  return value.trim().replace(/[)\].,;]+$/g, '');
}

export class TeamService {
  async createTeam(ownerId: string, name: string) {
    const existingUser = await PlatformUser.findById(ownerId);
    if (!existingUser) throw new Error('User not found');
    if (existingUser.teamId) throw new Error('You are already in a team');

    const team = await Team.create({
      name,
      ownerId,
      members: [{ userId: ownerId, role: 'owner' }]
    });

    await PlatformUser.findByIdAndUpdate(ownerId, {
      teamId: team._id,
      teamRole: 'owner'
    });

    return team;
  }

  async getTeam(teamId: string) {
    const team = await Team.findById(teamId);
    if (!team) throw new Error('Team not found');
    return team;
  }

  async inviteMember(teamId: string, inviterUserId: string, email: string, role: 'editor' | 'viewer' = 'editor') {
    const team = await Team.findById(teamId);
    if (!team) throw new Error('Team not found');

    if (team.ownerId.toString() !== inviterUserId) {
      const member = team.members.find((m: any) => m.userId.toString() === inviterUserId);
      if (!member || member.role !== 'owner') {
        throw new Error('Only the team owner can invite members');
      }
    }

    const existingUser = await PlatformUser.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      const alreadyMember = team.members.some((m: any) => m.userId.toString() === existingUser._id.toString());
      if (alreadyMember) throw new Error('User is already a team member');
    }

    const token = randomBytes(16).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 3600000); // 7 days

    await Team.findByIdAndUpdate(teamId, {
      $push: {
        invites: { email: email.toLowerCase(), role, token, expiresAt }
      }
    });

    const frontendBase = process.env.FRONTEND_URL?.split(',')[0]?.trim() || 'http://localhost:3000';
    const inviteUrl = `${frontendBase}/team?token=${token}`;
    const signupInviteUrl = `${frontendBase}/signup?inviteToken=${token}&email=${encodeURIComponent(email.toLowerCase())}`;
    console.log(`[Team Invite] ${email}: ${inviteUrl}`);

    let emailSent = false;
    let emailError: string | undefined;
    try {
      const mailResult = await sendTeamInviteEmail({
        to: email.toLowerCase(),
        teamName: team.name,
        role,
        inviteUrl,
        signupInviteUrl
      });
      emailSent = mailResult.sent;
      emailError = mailResult.reason;
    } catch (err: any) {
      emailError = err?.message || 'Failed to send invite email';
      console.error('[Team Invite Email] Error:', emailError);
    }

    return {
      email,
      role,
      inviteUrl,
      signupInviteUrl,
      emailSent,
      emailError,
      expiresAt,
      token: process.env.NODE_ENV !== 'production' ? token : undefined
    };
  }

  async acceptInvite(userId: string, token: string) {
    const normalizedToken = normalizeInviteTokenInput(token);
    if (!normalizedToken) throw new Error('Invite token is required');

    const user = await PlatformUser.findById(userId);
    if (!user) throw new Error('User not found');

    const team = await Team.findOne({
      'invites.token': normalizedToken,
      'invites.expiresAt': { $gt: new Date() }
    });

    // If token is already consumed/expired but user is already in a team,
    // treat this as idempotent success to avoid noisy 400s on repeated clicks.
    if (!team) {
      if (user.teamId) {
        return {
          teamId: user.teamId,
          role: user.teamRole || 'viewer',
          alreadyMember: true
        };
      }
      throw new Error('Invalid or expired invite');
    }

    const invite = team.invites.find((i: any) => i.token === normalizedToken);
    if (!invite) throw new Error('Invite not found');

    if (user.email.toLowerCase() !== invite.email.toLowerCase()) {
      throw new Error('This invite is for a different email address');
    }

    if (user.teamId) {
      if (String(user.teamId) === String(team._id)) {
        await Team.findByIdAndUpdate(team._id, {
          $pull: { invites: { token: normalizedToken } }
        });

        return {
          teamId: team._id,
          role: user.teamRole || invite.role,
          alreadyMember: true
        };
      }

      throw new Error('You are already in another team. Leave current team first.');
    }

    await Team.findByIdAndUpdate(team._id, {
      $push: { members: { userId, role: invite.role } },
      $pull: { invites: { token: normalizedToken } }
    });

    await PlatformUser.findByIdAndUpdate(userId, {
      teamId: team._id,
      teamRole: invite.role
    });

    return { teamId: team._id, role: invite.role };
  }

  async removeMember(teamId: string, ownerUserId: string, targetUserId: string) {
    const team = await Team.findById(teamId);
    if (!team) throw new Error('Team not found');
    if (team.ownerId.toString() !== ownerUserId) throw new Error('Only the owner can remove members');
    if (ownerUserId === targetUserId) throw new Error('Cannot remove yourself as owner');

    await Team.findByIdAndUpdate(teamId, {
      $pull: { members: { userId: targetUserId } }
    });

    await PlatformUser.findByIdAndUpdate(targetUserId, {
      teamId: null,
      teamRole: null
    });

    return { removed: true };
  }

  async updateMemberRole(
    teamId: string,
    ownerUserId: string,
    targetUserId: string,
    role: 'editor' | 'viewer'
  ) {
    const team = await Team.findById(teamId);
    if (!team) throw new Error('Team not found');
    if (team.ownerId.toString() !== ownerUserId) throw new Error('Only the owner can change member roles');
    if (ownerUserId === targetUserId) throw new Error('Owner role cannot be changed');

    const target = team.members.find((m: any) => m.userId.toString() === targetUserId);
    if (!target) throw new Error('Member not found');
    if (target.role === 'owner') throw new Error('Owner role cannot be changed');

    await Team.updateOne(
      { _id: teamId, 'members.userId': targetUserId },
      { $set: { 'members.$.role': role } }
    );

    await PlatformUser.findByIdAndUpdate(targetUserId, { teamRole: role });

    return { userId: targetUserId, role };
  }

  async leaveTeam(userId: string) {
    const user = await PlatformUser.findById(userId);
    if (!user || !user.teamId) throw new Error('You are not in a team');

    const team = await Team.findById(user.teamId);
    if (!team) throw new Error('Team not found');

    if (team.ownerId.toString() === userId) {
      throw new Error('Team owner cannot leave. Transfer ownership or delete the team.');
    }

    await Team.findByIdAndUpdate(user.teamId, {
      $pull: { members: { userId } }
    });

    await PlatformUser.findByIdAndUpdate(userId, {
      teamId: null,
      teamRole: null
    });

    return { left: true };
  }

  async deleteTeam(teamId: string, ownerUserId: string) {
    const team = await Team.findById(teamId);
    if (!team) throw new Error('Team not found');
    if (team.ownerId.toString() !== ownerUserId) throw new Error('Only the owner can delete the team');

    const memberIds = team.members.map((m: any) => m.userId);
    await PlatformUser.updateMany(
      { _id: { $in: memberIds } },
      { teamId: null, teamRole: null }
    );

    await Team.findByIdAndDelete(teamId);
    return { deleted: true };
  }

  async listTeamMembers(teamId: string) {
    const team = await Team.findById(teamId);
    if (!team) throw new Error('Team not found');

    const memberIds = team.members.map((m: any) => m.userId);
    const users = await PlatformUser.find({ _id: { $in: memberIds } })
      .select('email name avatar role plan');

    return team.members.map((m: any) => {
      const user = users.find((u: any) => u._id.toString() === m.userId.toString());
      return {
        userId: m.userId,
        role: m.role,
        joinedAt: m.joinedAt,
        email: user?.email || '',
        name: user?.name || '',
        avatar: user?.avatar || ''
      };
    });
  }
}

export const teamService = new TeamService();

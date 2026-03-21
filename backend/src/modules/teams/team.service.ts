import { randomBytes } from 'crypto';
import { Team } from './team.model';
import { PlatformUser } from '../platform-auth/platform-user.model';

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

    const inviteUrl = `${process.env.FRONTEND_URL?.split(',')[0]?.trim() || 'http://localhost:3000'}/team/join?token=${token}`;
    console.log(`[Team Invite] ${email}: ${inviteUrl}`);

    return { email, role, token: process.env.NODE_ENV !== 'production' ? token : undefined };
  }

  async acceptInvite(userId: string, token: string) {
    const team = await Team.findOne({
      'invites.token': token,
      'invites.expiresAt': { $gt: new Date() }
    });

    if (!team) throw new Error('Invalid or expired invite');

    const invite = team.invites.find((i: any) => i.token === token);
    if (!invite) throw new Error('Invite not found');

    const user = await PlatformUser.findById(userId);
    if (!user) throw new Error('User not found');

    if (user.email.toLowerCase() !== invite.email.toLowerCase()) {
      throw new Error('This invite is for a different email address');
    }

    if (user.teamId) throw new Error('You are already in a team');

    await Team.findByIdAndUpdate(team._id, {
      $push: { members: { userId, role: invite.role } },
      $pull: { invites: { token } }
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

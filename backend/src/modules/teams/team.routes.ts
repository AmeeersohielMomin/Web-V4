import { Router, Request, Response } from 'express';
import { requireAuth } from '../../middleware/auth.middleware';
import { teamService } from './team.service';
import { PlatformUser } from '../platform-auth/platform-user.model';

const router = Router();

// Create team
router.post('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ success: false, data: null, error: 'Team name is required' });
    const team = await teamService.createTeam((req as any).userId, name);
    res.status(201).json({ success: true, data: { team }, error: null });
  } catch (err: any) {
    res.status(400).json({ success: false, data: null, error: err.message });
  }
});

// Get current user's team
router.get('/my-team', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = await PlatformUser.findById((req as any).userId).select('teamId');
    if (!user?.teamId) return res.json({ success: true, data: { team: null }, error: null });
    const team = await teamService.getTeam(user.teamId.toString());
    const members = await teamService.listTeamMembers(user.teamId.toString());
    res.json({ success: true, data: { team, members }, error: null });
  } catch (err: any) {
    res.status(400).json({ success: false, data: null, error: err.message });
  }
});

// Invite member
router.post('/invite', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = await PlatformUser.findById((req as any).userId).select('teamId');
    if (!user?.teamId) return res.status(400).json({ success: false, data: null, error: 'You are not in a team' });
    const { email, role } = req.body;
    const normalizedEmail = String(email || '').trim().toLowerCase();
    const normalizedRole = role === 'viewer' ? 'viewer' : 'editor';

    if (!normalizedEmail || !/^\S+@\S+\.\S+$/.test(normalizedEmail)) {
      return res.status(400).json({ success: false, data: null, error: 'Valid invite email is required' });
    }

    const result = await teamService.inviteMember(
      user.teamId.toString(),
      (req as any).userId,
      normalizedEmail,
      normalizedRole
    );
    res.json({ success: true, data: result, error: null });
  } catch (err: any) {
    res.status(400).json({ success: false, data: null, error: err.message });
  }
});

// Accept invite
router.post('/accept-invite', requireAuth, async (req: Request, res: Response) => {
  try {
    const token = String(req.body?.token || '').trim();
    if (!token) {
      return res.status(400).json({ success: false, data: null, error: 'Invite token is required' });
    }

    const result = await teamService.acceptInvite((req as any).userId, token);
    res.json({ success: true, data: result, error: null });
  } catch (err: any) {
    res.status(400).json({ success: false, data: null, error: err.message });
  }
});

// Remove member (owner only)
router.delete('/members/:targetUserId', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = await PlatformUser.findById((req as any).userId).select('teamId');
    if (!user?.teamId) return res.status(400).json({ success: false, data: null, error: 'You are not in a team' });
    const result = await teamService.removeMember(user.teamId.toString(), (req as any).userId, req.params.targetUserId);
    res.json({ success: true, data: result, error: null });
  } catch (err: any) {
    res.status(400).json({ success: false, data: null, error: err.message });
  }
});

// Update member role (owner only)
router.patch('/members/:targetUserId/role', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = await PlatformUser.findById((req as any).userId).select('teamId');
    if (!user?.teamId) return res.status(400).json({ success: false, data: null, error: 'You are not in a team' });

    const role = req.body?.role === 'viewer' ? 'viewer' : req.body?.role === 'editor' ? 'editor' : null;
    if (!role) {
      return res.status(400).json({ success: false, data: null, error: 'Role must be editor or viewer' });
    }

    const result = await teamService.updateMemberRole(
      user.teamId.toString(),
      (req as any).userId,
      req.params.targetUserId,
      role
    );
    res.json({ success: true, data: result, error: null });
  } catch (err: any) {
    res.status(400).json({ success: false, data: null, error: err.message });
  }
});

// Leave team
router.post('/leave', requireAuth, async (req: Request, res: Response) => {
  try {
    const result = await teamService.leaveTeam((req as any).userId);
    res.json({ success: true, data: result, error: null });
  } catch (err: any) {
    res.status(400).json({ success: false, data: null, error: err.message });
  }
});

// Delete team (owner only)
router.delete('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = await PlatformUser.findById((req as any).userId).select('teamId');
    if (!user?.teamId) return res.status(400).json({ success: false, data: null, error: 'You are not in a team' });
    const result = await teamService.deleteTeam(user.teamId.toString(), (req as any).userId);
    res.json({ success: true, data: result, error: null });
  } catch (err: any) {
    res.status(400).json({ success: false, data: null, error: err.message });
  }
});

export default router;

export type AvatarPhase = 'waiting' | 'entering' | 'greeting' | 'idle';
export const AVATAR_ENTRANCE_MS = 1100;
export const AVATAR_GREETING_MS = 1400;
export const AVATAR_VISIBILITY_THRESHOLD = .45;

type AvatarReadiness = {
  visible: boolean;
  ready: boolean;
  pageVisible: boolean;
  reducedMotion?: boolean;
};

// Actual drawn poses, not a repeated translation of a single standing image.
// Times are shared by the playback controller and its reduced-motion tests.
export const AVATAR_POSES = [
  { at: 0, frame: 1 },       // Anticipation: bend knees.
  { at: 190, frame: 2 },     // Push off and tuck legs.
  { at: 670, frame: 3 },     // Contact: absorb the landing.
  { at: 880, frame: 0 },     // Stand and regain balance.
  { at: 1100, frame: 4 },    // Bring a hand out of the pocket.
  { at: 1240, frame: 5 },
  { at: 1390, frame: 6 },
  { at: 1540, frame: 7 },
  { at: 1690, frame: 6 },
  { at: 1840, frame: 7 },
  { at: 1990, frame: 5 },
  { at: 2170, frame: 4 },
  { at: 2320, frame: 0 },    // Return to the original hands-in-pockets pose.
] as const;

export function avatarPoseAt(elapsed: number) {
  let frame: number = AVATAR_POSES[0].frame;
  for (const pose of AVATAR_POSES) {
    if (elapsed < pose.at) break;
    frame = pose.frame;
  }
  return frame;
}

// Memory belongs to this document, not local/sessionStorage. A full refresh resets it.
// Anchor navigation, scrolling and component remounts keep the entrance consumed.
export function createAvatarVisit() {
  let seen = false;
  return {
    hasEntered: () => seen,
    enter({ visible, ready, pageVisible, reducedMotion = false }: AvatarReadiness): AvatarPhase {
      if (seen) return 'idle';
      if (!visible || !ready || !pageVisible) return 'waiting';
      seen = true;
      return reducedMotion ? 'idle' : 'entering';
    },
  };
}

export const avatarVisit = createAvatarVisit();

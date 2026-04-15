// Database schemas and types
export interface Profile {
  id: string;
  username: string;
  email: string | null;
  avatar_url: string | null;
  bio: string | null;
  points: number;
  followers_count: number;
  following_count: number;
  likes_count?: number;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  sender_id: string;
  recipient_id: string;
  content: string;
  message_hash?: string;
  read: boolean;
  read_at: string | null;
  created_at: string;
  updated_at: string;
  sender?: { username: string; avatar_url: string | null };
  recipient?: { username: string; avatar_url: string | null };
}

export interface Reel {
  id: string;
  user_id: string;
  video_url: string;
  thumbnail_url: string | null;
  caption: string | null;
  viewers: string[];
  created_at: string;
  expires_at: string;
  approved: boolean;
  plant_votes_yes: number;
  plant_votes_no: number;
  poll_expires_at: string | null;
  likes_count?: number;
  is_liked?: boolean;
  user?: { username: string; avatar_url: string | null };
}

export interface PointsLog {
  id: string;
  user_id: string;
  action: string;
  points_earned: number;
  description: string | null;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  type: 'follow' | 'follow_back' | 'like' | 'comment' | 'message';
  from_user_id: string;
  message: string;
  read_at: string | null;
  created_at: string;
  updated_at: string;
  from_user?: { username: string; avatar_url: string | null };
}

export interface Post {
  id: string;
  user_id: string;
  image_url: string;
  caption: string | null;
  likes_count?: number;
  created_at: string;
  approved: boolean;
}

export const POINT_ACTIONS = {
  UPLOAD_PHOTO: { points: 5, description: 'Uploaded a plant photo' },
  CREATE_POST: { points: 5, description: 'Created a post' },
  FOLLOW_USER: { points: 5, description: 'Followed a user' },
  SEND_MESSAGE: { points: 1, description: 'Sent a message' },
  ACCEPT_FRIEND_REQUEST: { points: 10, description: 'Made a new friend' },
} as const;


import { request } from './client';
import type { UserProfile } from '../types';

export const fetchProfile = () => request<UserProfile>('/auth/profile', { method: 'GET' });

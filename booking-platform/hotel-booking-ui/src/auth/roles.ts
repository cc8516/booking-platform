import { groupConfig } from '../config/env';
import type { AuthUser } from './types';

export const isAdmin = (user: AuthUser): boolean => user.groups.includes(groupConfig.admin);

export const isHotelManager = (user: AuthUser): boolean =>
  user.groups.includes(groupConfig.hotelManager);

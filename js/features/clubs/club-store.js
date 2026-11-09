// クラブの読み書き（スマホの中の保存場所）

import { getAll, putOne } from '../../db/database.js';

export const listClubs = () => getAll('clubs');
export const saveClub = (club) => putOne('clubs', club);

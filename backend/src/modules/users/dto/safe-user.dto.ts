import { UserRole } from '../../../common/enums/user-role.enum';

export type SafeUser = {
  id: string;
  username: string;
  role: UserRole;
};


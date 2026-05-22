import { IsEnum, IsString, MinLength } from 'class-validator';
import { UserRole } from '../../../common/enums/user-role.enum';

export class LoginDto {
  @IsString()
  username: string;

  @IsString()
  @MinLength(4)
  password: string;

  @IsEnum(UserRole)
  role: UserRole;
}


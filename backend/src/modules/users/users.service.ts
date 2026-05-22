import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserEntity } from './entities/user.entity';
import { SafeUser } from './dto/safe-user.dto';
import { UserRole } from '../../common/enums/user-role.enum';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly usersRepository: Repository<UserEntity>,
  ) {}

  private async ensureBaseUsers() {
    const baseUsers = [
      { username: 'administrador', password: 'administrador', role: UserRole.ADMINISTRADOR },
      { username: 'caja', password: 'caja', role: UserRole.CAJA },
      { username: 'medico', password: 'medico', role: UserRole.MEDICO },
      { username: 'paciente1', password: 'paciente1', role: UserRole.PACIENTE },
      { username: 'paciente2', password: 'paciente2', role: UserRole.PACIENTE },
      { username: 'paciente3', password: 'paciente3', role: UserRole.PACIENTE },
      { username: 'paciente4', password: 'paciente4', role: UserRole.PACIENTE },
      { username: 'paciente5', password: 'paciente5', role: UserRole.PACIENTE },
    ];

    for (const item of baseUsers) {
      const existing = await this.usersRepository.findOne({ where: { username: item.username } });
      if (!existing) {
        const passwordHash = await bcrypt.hash(item.password, 10);
        await this.usersRepository.save(
          this.usersRepository.create({
            username: item.username,
            passwordHash,
            role: item.role,
            isActive: true,
          }),
        );
      }
    }
  }

  async findByUsername(username: string): Promise<UserEntity | null> {
    await this.ensureBaseUsers();
    return this.usersRepository.findOne({ where: { username } });
  }

  toSafeUser(user: UserEntity): SafeUser {
    return {
      id: user.id,
      username: user.username,
      role: user.role,
    };
  }
}


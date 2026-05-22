import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { LoginDto } from './dto/login.dto';
import { RegisterPatientDto } from './dto/register-patient.dto';
import { UsersService } from '../users/users.service';
import { UserRole } from '../../common/enums/user-role.enum';
import { UserEntity } from '../users/entities/user.entity';
import { PatientProfileEntity } from '../patient/entities/patient-profile.entity';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    @InjectRepository(UserEntity)
    private readonly usersRepository: Repository<UserEntity>,
    @InjectRepository(PatientProfileEntity)
    private readonly profileRepository: Repository<PatientProfileEntity>,
  ) {}

  async login(dto: LoginDto) {
    const user = await this.usersService.findByUsername(dto.username);

    if (!user || user.role !== dto.role || !user.isActive) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const safeUser = this.usersService.toSafeUser(user);
    const accessToken = await this.jwtService.signAsync({
      sub: safeUser.id,
      username: safeUser.username,
      role: safeUser.role,
    });

    return {
      accessToken,
      user: safeUser,
    };
  }

  async registerPatient(dto: RegisterPatientDto) {
    const dni = dto.dni.trim();
    const username = dto.username.trim().toLowerCase();
    const password = dto.password.trim();
    const nombres = dto.nombres.trim();
    const apellidoPaterno = dto.apellidoPaterno.trim();
    const apellidoMaterno = dto.apellidoMaterno.trim();
    const telefono = dto.telefono?.trim() || null;
    const fechaNacimiento = dto.fechaNacimiento?.trim() || null;

    if (!dni || !username || !password || !nombres || !apellidoPaterno || !apellidoMaterno) {
      throw new BadRequestException('Faltan campos obligatorios para registrar paciente');
    }

    const existingUser = await this.usersService.findByUsername(username);
    if (existingUser) {
      throw new ConflictException('El nombre de usuario ya existe');
    }

    const existingProfileByDni = await this.profileRepository.findOne({ where: { dni } });
    if (existingProfileByDni) {
      throw new ConflictException('Ya existe un paciente registrado con ese DNI');
    }

    const existingProfileByUsername = await this.profileRepository.findOne({
      where: { username },
    });
    if (existingProfileByUsername) {
      throw new ConflictException('El usuario ya está vinculado a otro perfil');
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const createdUser = await this.usersRepository.save(
      this.usersRepository.create({
        username,
        passwordHash,
        role: UserRole.PACIENTE,
        isActive: true,
      }),
    );

    const fullName = `${nombres} ${apellidoPaterno} ${apellidoMaterno}`.trim();
    await this.profileRepository.save(
      this.profileRepository.create({
        username,
        fullName,
        firstName: nombres,
        paternalLastName: apellidoPaterno,
        maternalLastName: apellidoMaterno,
        dni,
        phone: telefono,
        birthDate: fechaNacimiento,
        bloodType: 'O+',
        allergies: [],
        chronicDiseases: [],
        currentMedication: [],
      }),
    );

    return {
      message: 'Cuenta de paciente creada correctamente',
      user: this.usersService.toSafeUser(createdUser),
    };
  }

  async recoverPatientByDni(dni: string) {
    const normalizedDni = dni.trim();
    const profile = await this.profileRepository.findOne({ where: { dni: normalizedDni } });
    if (!profile) {
      throw new NotFoundException('No existe una cuenta asociada a ese DNI');
    }

    const user = await this.usersService.findByUsername(profile.username);
    if (!user || user.role !== UserRole.PACIENTE) {
      throw new NotFoundException('No existe un usuario paciente asociado a ese DNI');
    }

    return {
      message: 'Cuenta encontrada',
      username: user.username,
      role: user.role,
      paciente: profile.fullName,
    };
  }
}


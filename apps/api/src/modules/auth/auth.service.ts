import {
    ConflictException,
    Injectable,
    UnauthorizedException,
} from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { CreateUserDto } from './dto/create-user.dto';

@Injectable()
export class AuthService {
    constructor(
        private usersService: UsersService,
        private jwtService: JwtService,
    ) {}

    async validateUser(email: string, pass: string): Promise<any> {
        const user = await this.usersService.findOne(email);
        if (user && (await bcrypt.compare(pass, user.password))) {
            const { password, ...result } = user;
            return result;
        }
        return null;
    }

    async login(user: any) {
        const payload = { email: user.email, sub: user.id, role: user.role };
        return {
            access_token: this.jwtService.sign(payload),
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role,
            },
        };
    }

    async register(dto: CreateUserDto) {
        // Check for duplicate email
        const existing = await this.usersService.findOne(dto.email);
        if (existing) {
            throw new ConflictException(
                'An account with this email already exists. Please sign in or use a different email.',
            );
        }

        const hashedPassword = await bcrypt.hash(dto.password, 12); // cost factor 12
        const user = await this.usersService.create({
            email: dto.email,
            password: hashedPassword,
            name: dto.name,
        });

        // Never return the hashed password
        const { password, ...result } = user;
        return result;
    }
}

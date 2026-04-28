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
        const hashedPassword = await bcrypt.hash(dto.password, 10); // cost factor 10 for serverless

        try {
            const user = await this.usersService.create({
                email: dto.email,
                password: hashedPassword,
                name: dto.name,
            });

            // Never return the hashed password
            const { password, ...result } = user;
            return result;
        } catch (err: any) {
            if (err.code === 'P2002') {
                throw new ConflictException('Email already exists');
            }
            throw err;
        }
    }
}

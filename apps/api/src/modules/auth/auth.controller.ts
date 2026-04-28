import { Controller, Request, Post, UseGuards, Body, Get } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CreateUserDto } from './dto/create-user.dto';

@Controller('auth')
export class AuthController {
    constructor(private authService: AuthService) { }

    @Post('login')
    async login() {
        return { message: 'Auth disabled' };
    }

    @Post('register')
    async register() {
        return { message: 'Auth disabled' };
    }

    @Get('profile')
    getProfile() {
        return { message: 'Auth disabled' };
    }
}

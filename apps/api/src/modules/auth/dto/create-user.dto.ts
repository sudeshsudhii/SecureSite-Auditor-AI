import {
    IsEmail,
    IsNotEmpty,
    IsString,
    Matches,
    MaxLength,
    MinLength,
} from 'class-validator';

/**
 * Password policy:
 *  - 8–64 characters
 *  - At least one uppercase letter
 *  - At least one lowercase letter
 *  - At least one digit
 *  - At least one special character  (!@#$%^&*...)
 */
const PASSWORD_REGEX =
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()\-_=+\[\]{};':",.<>/?\\|`~])[A-Za-z\d!@#$%^&*()\-_=+\[\]{};':",.<>/?\\|`~]{8,64}$/;

export class CreateUserDto {
    @IsEmail({}, { message: 'Please enter a valid email address.' })
    @IsNotEmpty({ message: 'Email is required.' })
    email: string;

    @IsString()
    @IsNotEmpty({ message: 'Password is required.' })
    @MinLength(8, { message: 'Password must be at least 8 characters long.' })
    @MaxLength(64, { message: 'Password must not exceed 64 characters.' })
    @Matches(PASSWORD_REGEX, {
        message:
            'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character.',
    })
    password: string;

    @IsString()
    @IsNotEmpty({ message: 'Name is required.' })
    @MinLength(2, { message: 'Name must be at least 2 characters.' })
    @MaxLength(80, { message: 'Name must not exceed 80 characters.' })
    name: string;
}

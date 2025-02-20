import { JwtService } from '@nestjs/jwt';
export declare class AuthService {
    private readonly jwtService;
    constructor(jwtService: JwtService);
    login(user: any): Promise<{
        access_token: string;
    }>;
    validateToken(token: string): Promise<any>;
}

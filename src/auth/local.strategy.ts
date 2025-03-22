import { Strategy } from 'passport-local';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(private authService: AuthService) {
    super();
  }

  async validate(username: string, password: string): Promise<any> {
    console.log('LocalStrategy validate called with username:', username);
    const user = await this.authService.validateUser(username, password);
    if (!user) {
      console.log('Authentication failed for user:', username);
      throw new UnauthorizedException('Invalid credentials');
    }
    console.log('Authentication successful for user:', username);
    return user;
  }
}

export default LocalStrategy;

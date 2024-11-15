import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-local';
import { AuthService } from './auth.service';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy, 'local') {
  constructor(private authService: AuthService) {
    super({
      usernameField: 'username', // This defines the field for the username, you can change it if needed
    });
  }

  async validate(username: string, password: string): Promise<any> {
    console.log('Local validation called with', username);
    const user = await this.authService.validateUser(username, password);
    if (!user) {
      throw new Error('Invalid local credentials');
    }
    return user;
  }
}

export default LocalStrategy;

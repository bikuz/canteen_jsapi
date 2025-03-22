// jwt-auth.guard.ts
import { ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    // Check if route is marked as public using the decorator
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    
    console.log('Checking route protection:', { isPublic });
    
    if (isPublic) {
      console.log('Public route accessed, allowing request.');
      return true;
    }
    
    // Also check the specific path for email verification
    const request = context.switchToHttp().getRequest();
    const path = request.route?.path;
    
    if (path === '/users/verify-email') {
      console.log('Email verification route accessed, allowing request.');
      return true;
    }
    
    console.log('Protected route, checking authentication.');
    return super.canActivate(context);
  }
}

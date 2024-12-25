import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class LdapAuthGuard extends AuthGuard('ldap') {
    async canActivate(context: ExecutionContext): Promise<boolean> {
        console.log('LdapAuthGuard hit'); // Log to check if it reaches here
        try {
          const result = (await super.canActivate(context)) as boolean;
          // console.log('Guard result:', result); // Log the result of the guard
          return result;
        } catch (error) {
          console.error('Error in LdapAuthGuard:', error); // Log the error if something goes wrong
          throw error; // Re-throw the error for proper handling
        }
      }
}
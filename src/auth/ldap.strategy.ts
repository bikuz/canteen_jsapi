import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import Strategy = require("passport-ldapauth");
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { Request } from 'express';

// Define an interface for the request body
interface LdapRequestBody {
    username: string;
}

@Injectable()
export class LdapStrategy extends PassportStrategy(Strategy, 'ldap') {
    constructor(
        private configService: ConfigService,
        private authService: AuthService
    ) {
        super({
            usernameField: 'username',
            passReqToCallback: true, // Pass the request to the callback
            server: {
              url:  configService.get<string>('LD_URL'),
              bindDN: configService.get<string>('LD_BIND_DN'),
              bindCredentials: configService.get<string>('LD_BIND_CREDENTIALS'),
              searchBase: configService.get<string>('LD_SEARCH_BASE'),
              searchFilter: configService.get<string>('LD_SEARCH_FILTER'),
              searchAttributes: ['uid', 'cn', 'sn', 'mail', 'givenName', 'telephoneNumber'],

            },
        });
    }

    async validate(req: Request & { body: LdapRequestBody }, ldapUser: any): Promise<any> {
        const username = req.body.username; // Extract username from the request
        // console.log('LDAP user found:', ldapUser);  // Log the user data
        try {
            const user = await this.authService.validateLdapUser({
                username: ldapUser.uid || username, // Use ldapUser.uid or fallback to username
                firstName: ldapUser.givenName,
                lastName: ldapUser.sn,
                email: ldapUser.mail,
                phoneNumber: ldapUser.telephoneNumber
            });
            if (!user) {
                console.error('LDAP user validation failed: User not found');
                throw new Error('Invalid LDAP credentials');
            }
            return user;
        } catch (error) {
            console.error('Error in LDAP validation:', error);
            throw new Error('LDAP Authentication failed');
        }
    }
}
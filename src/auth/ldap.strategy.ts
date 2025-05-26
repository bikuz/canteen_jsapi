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
        // Get LDAP URL with a fallback value
        const ldapUrl = configService.get<string>('LDAP_URL');
        console.log('LDAP URL from config:', ldapUrl);
        
        super({
            usernameField: 'username',
            passReqToCallback: true, // Pass the request to the callback
            server: {
              url: ldapUrl || 'ldap://localhost:389', // Provide a default URL
              bindDN: configService.get<string>('LDAP_BIND_DN') || '',
              bindCredentials: configService.get<string>('LDAP_BIND_CREDENTIALS') || '',
              searchBase: configService.get<string>('LDAP_SEARCH_BASE') || 'ou=users,dc=example,dc=com',
              searchFilter: configService.get<string>('LDAP_SEARCH_FILTER') || '(uid={{username}})',
              searchAttributes: ['uid', 'cn', 'sn', 'mail', 'givenName', 'telephoneNumber'],
            },
        });
    }

    async validate(req: Request & { body: LdapRequestBody }, ldapUser: any): Promise<any> {
        const username = req.body.username; // Extract username from the request
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
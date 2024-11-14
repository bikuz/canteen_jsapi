import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
// import { Strategy } from 'passport-ldapauth';
// import Strategy from 'passport-ldapauth';
// import {Strategy} from 'passport-local';  
import Strategy = require("passport-ldapauth");
// import * as Strategy from 'passport-ldapauth';
// import { Strategy as LdpStrategy } from 'passport-ldapauth';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
// import { IStrategyOptions } from 'passport-ldapauth';
// const LdpStrategy = require('passport-ldapauth');

@Injectable()
export class LdapStrategy extends PassportStrategy(Strategy, 'ldap'){
    constructor(
        private configService: ConfigService,
        private authService: AuthService
    ){      
        console.log('LDAP_URL:', configService.get<string>('LDAP_URL'));
        console.log('LDAP_BIND_DN:', configService.get<string>('LDAP_BIND_DN'));
        console.log('LDAP_BIND_CREDENTIALS:', configService.get<string>('LDAP_BIND_CREDENTIALS'));
        console.log('LDAP_SEARCH_BASE:', configService.get<string>('LDAP_SEARCH_BASE'));
        console.log('LDAP_SEARCH_FILTER:', configService.get<string>('LDAP_SEARCH_FILTER'));

        // https://www.youtube.com/watch?v=Hl5AwewIlmI&list=PL62km_yqC3ZHlvkKVmR2f3W6SEzh8pRIf&index=7
        // https://www.youtube.com/watch?v=i-howKMrtCM
        
        super({
            usernameField: 'username',
            server: {
              url:  configService.get<string>('LDAP_URL'),
              bindDN: configService.get<string>('LDAP_BIND_DN'),
              bindCredentials: configService.get<string>('LDAP_BIND_CREDENTIALS'),
              searchBase: configService.get<string>('LDAP_SEARCH_BASE'),
              searchFilter: configService.get<string>('LDAP_SEARCH_FILTER'),
              searchAttributes: ['uid', 'cn', 'sn', 'mail'],
            },
          });
           
    }

    
    async validate(ldapUser: any): Promise<any> {
      
      console.log('LDAP user found:', ldapUser);  // Log the user data
       
      const user = await this.authService.validateLdapUser({
        username: ldapUser.uid,
        firstName: ldapUser.givenName,
        lastName: ldapUser.sn,
        email: ldapUser.mail,
        phoneNumber: ldapUser.telephoneNumber
      });
      if (!user) {
        // throw new UnauthorizedException('Invalid LDAP credentials');
        throw new Error('Invalid LDAP credentials');
      }
      return user;
    }
}
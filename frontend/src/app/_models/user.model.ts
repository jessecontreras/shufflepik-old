import { Album } from './album.model';
import { Guild } from './guild.model';

export interface User {
  _id: any;
  email?: string;
  password?: string;
  dob?: string;
  gender?: string;
  jwt?: string;
  refresh_token?: string;
  email_validation: {
    validated: boolean;
  };
  albums?: Album[];
  discord: {
    id?: string;
    connected: boolean;
    guilds?: Guild[];
    avatar?: string;
    username?: string;
  };
}
//TODO: TURN ALL OBSERVABLES INTO A SINGLE USER OBSERVABLE
//

export interface MicrosoftClaims {
  oid: string;
  tid: string;
  email: string;
  name: string;
  given_name?: string;
  family_name?: string;
  preferred_username?: string;
  iss: string;
  aud: string;
  exp: number;
  iat: number;
}

export interface MicrosoftAuthResult {
  usuario: any;
  isNewUser: boolean;
}

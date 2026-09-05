export interface JwtPayload {
  sub: string;
  email: string;
  name: string;
}

export interface AuthenticatedAdmin {
  id: string;
  email: string;
  name: string;
}

export interface LoginResponse {
  accessToken: string;
  expiresIn: string;
  admin: AuthenticatedAdmin;
}

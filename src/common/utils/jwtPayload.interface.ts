export interface JwtPayload {
  sub: number;
  role: 'Auctioneer' | 'Bidder' | 'Super Admin';
  iat: number;
  exp: number;
}

export class PaymentMethods {
  bankTransfer?: {
    bankAccountNumber: string;
    bankAccountName: string;
    bankName: string;
  };
  easypaisa?: {
    easypaisaAccountNumber: string;
  };
  paypal?: {
    paypalEmail: string;
  };
}

export class UserEntity {
  id: number;
  userName: string;
  password: string;
  email?: string;
  address?: string;
  phone: string;
  profileImagePublicId: string;
  profileImageUrl: string;
  paymentMethods?: PaymentMethods;
  role: 'Auctioneer' | 'Bidder' | 'Super Admin';
  unpaidCommission: number;
  auctionsWon: number;
  moneySpent: number;
  refreshToken?: string; //
  createdAt: Date;

  constructor(partial: Partial<UserEntity>) {
    Object.assign(this, partial);
    delete this.password;
  }
}

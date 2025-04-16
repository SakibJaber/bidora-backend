export class AuctionEntity {
  id: number;
  title: string;
  description?: string;
  startingBid: number;
  category: string;
  condition: 'New' | 'Used';
  currentBid: number;
  startTime: Date;
  endTime: Date;
  imagePublicId: string;
  imageUrl: string;
  createdBy: number;
  highestBidderId?: number;
  commissionCalculated: boolean;
  createdAt: Date;

  constructor(partial: Partial<AuctionEntity>) {
    Object.assign(this, partial);
  }
}

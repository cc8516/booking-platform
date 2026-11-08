export interface Hotel {
  id: string;
  name: string;
  city: string;
  country: string;
  pricePerNight: number;
  rating: number;
  description: string;
  /** Data URL for now; becomes an S3/CDN URL once the backend exists. */
  imageUrl?: string;
}

export type NewHotel = Omit<Hotel, 'id'>;

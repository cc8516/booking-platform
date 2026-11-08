export interface Hotel {
  id: string;
  name: string;
  city: string;
  country: string;
  pricePerNight: number;
  rating: number;
  description: string;
}

export type NewHotel = Omit<Hotel, 'id'>;

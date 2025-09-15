import { ObjectId } from 'mongodb';

export const ListingSchema = {
  _id: { type: ObjectId, required: true },
  product_id: { type: ObjectId, required: true, ref: 'products' },
  type: { type: String, required: true, enum: ['ask', 'bid'] },
  seller_id: { type: ObjectId, required: true, ref: 'users' },
  price: { type: Number, required: true },
  location: { type: String, required: true },
  image: { type: String, required: true },
  description: { type: String, required: true },
  status: { 
    type: String, 
    required: true, 
    enum: ['active', 'sold', 'expired'],
    default: 'active'
  },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
}; 
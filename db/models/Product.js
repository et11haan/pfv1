import { ObjectId } from 'mongodb';

export const ProductSchema = {
  _id: { type: ObjectId, required: true },
  title: { type: String, required: true },
  slug: { type: String, required: true, unique: true },
  part_numbers: {
    type: [{
      number: { type: String, required: true },
      link: { type: String, required: false }
    }],
    required: true
  },
  production_years: {
    start: { type: Number, required: true },
    end: { type: Number, required: true }
  },
  tags: { type: [String], required: true },
  images: { type: [String], required: true },
  description_markdown: { type: String, required: false },
  description_preview_html: { type: String, required: true },
  description_full_html: { type: String, required: true },
  lowest_ask: { type: Number, required: true },
  highest_bid: { type: Number, required: true },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
}; 

/**
 * DEMO PLACEHOLDER testimonials.
 * These are fictional examples, not verified customer reviews.
 * Replace with genuine customer feedback before production launch.
 */
export interface Testimonial {
  id: number;
  quote: string;
  name: string;
  note: string;
}

export const testimonials: Testimonial[] = [
  {
    id: 1,
    name: 'Ayesha Khalil',
    note: 'Modern Kitchen',
    quote:
      'I really liked the overall kitchen design. The modern look, attention to detail, and use of space made the design feel both beautiful and practical.'
  },
  {
    id: 2,
    name: 'Omer Nasir',
    note: 'Custom Wardrobe',
    quote:
      'The wardrobe design was exactly the kind of style I was looking for. I especially liked the clean finish and the way the storage space was planned.'
  },
  {
    id: 3,
    name: 'Faizan Ahmed',
    note: 'Interior Doors',
    quote:
      'The door designs offered a nice combination of elegance and simplicity. There were different styles to consider, making it easier to find a suitable design for the interior.'
  },
];

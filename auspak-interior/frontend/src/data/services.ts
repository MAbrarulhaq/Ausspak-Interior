export interface Service { slug: string; title: string; tag: string; description: string; image: string; projectCategory: 'Kitchens' | 'Wardrobes' | 'Doors'; icon: string }

export const services: Service[] = [
  { slug: 'spanish-style-kitchens', title: 'Spanish-Style Kitchens', tag: 'Classic Style', projectCategory: 'Kitchens', icon: 'home',
    description: 'Warm wood tones, framed cabinet doors and arch details, made to fit your kitchen.', image: '/images/service-spanish-kitchens.jpg' },
  { slug: 'custom-kitchens', title: 'Custom Kitchens', tag: 'Modern Style', projectCategory: 'Kitchens', icon: 'dashboard_customize',
    description: 'Kitchens designed around your room size and daily use, with cabinets, drawers and storage planned to suit you.', image: '/images/service-custom-kitchens.jpg' },
  { slug: 'modern-wardrobes', title: 'Modern Wardrobes', tag: 'Wardrobes', projectCategory: 'Wardrobes', icon: 'layers',
    description: 'Fitted and walk-in wardrobes with shelves, drawers and hanging space planned around your belongings.', image: '/images/service-modern-wardrobes.jpg' },
  { slug: 'interior-doors', title: 'Interior Doors', tag: 'Doors', projectCategory: 'Doors', icon: 'texture',
    description: 'Interior doors made to your opening sizes, in finishes that match your rooms.', image: '/images/service-interior-doors.jpg' },
];

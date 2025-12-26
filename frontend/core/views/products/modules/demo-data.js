const demoTemplates = [
  {
    title: 'Happy Birthday Video from Africa',
    slug: 'happy-birthday-video-from-africa',
    price: 2400,
    instant: 0,
    delivery_days: 2,
    video_url: 'https://res.cloudinary.com/demo/video/upload/w_640,h_360,c_fill/dog.mp4',
    media: [
      'https://res.cloudinary.com/demo/image/upload/w_600,h_400,c_fill/sample.jpg',
      'https://res.cloudinary.com/demo/image/upload/w_600,h_400,c_fill/kitten.jpg'
    ],
    addons: [
      { type: 'heading', label: 'Photos', text: 'Photo Options' },
      {
        type: 'select',
        label: 'How many photos do you want to use?',
        options: [
          { label: 'Do not include photo', price: 0, default: true },
          { label: '1 photo', price: 0, file: true, fileQuantity: 1 },
          { label: '2 photos', price: 5, file: true, fileQuantity: 2 },
          { label: '3 photos', price: 8, file: true, fileQuantity: 3 }
        ]
      },
      { type: 'textarea', label: 'What shall we say', placeholder: 'e.g. Happy birthday video for Alice', required: true },
      {
        type: 'radio',
        label: 'Choose song',
        options: [
          { label: 'We choose it for you (faster & funnier)', price: 0, default: true },
          { label: 'I want my own music', price: 0, textField: true, textLabel: 'Song link or details', textPlaceholder: 'Paste link or describe song' }
        ]
      },
      {
        type: 'radio',
        label: 'Delivery time',
        options: [
          { label: 'Instant Delivery (60 Minutes)', price: 0, default: true, delivery: { instant: true, days: 0 } },
          { label: '24 Hours Express', price: 10, delivery: { instant: false, days: 1 } }
        ]
      },
      {
        type: 'checkbox_group',
        label: 'Extras',
        options: [
          { label: 'Funny video cut', price: 10 },
          { label: 'Sing happy birthday', price: 15 },
          { label: 'Permission to post on social media', price: 0 }
        ]
      },
      { type: 'email', label: 'Email address', placeholder: 'Where we send the video', required: true }
    ]
  },
  {
    title: 'Wedding Blessing Montage',
    slug: 'wedding-blessing-montage',
    price: 5200,
    instant: 0,
    delivery_days: 3,
    video_url: 'https://res.cloudinary.com/demo/video/upload/w_640,h_360,c_fill/elephants.mp4',
    media: [
      'https://res.cloudinary.com/demo/image/upload/w_600,h_400,c_fill/woman.jpg'
    ],
    addons: [
      { type: 'text', label: 'Couple names', placeholder: 'Name 1 & Name 2', required: true },
      { type: 'file', label: 'Wedding photos', file: { pricePerUnit: 0, multiple: true, askQuantity: true } },
      {
        type: 'checkbox_group',
        label: 'Style extras',
        options: [
          { label: 'Gold frame', price: 5 },
          { label: 'Soft film grain', price: 3 }
        ]
      }
    ]
  },
  {
    title: 'Business Shoutout Reel',
    slug: 'business-shoutout-reel',
    price: 3600,
    instant: 0,
    delivery_days: 1,
    video_url: 'https://res.cloudinary.com/demo/video/upload/w_640,h_360,c_fill/bike.mp4',
    media: [
      'https://res.cloudinary.com/demo/image/upload/w_600,h_400,c_fill/coffee.jpg'
    ],
    addons: [
      { type: 'text', label: 'Brand name', placeholder: 'Your brand', required: true },
      { type: 'textarea', label: 'Key message', placeholder: 'What should we say?', required: true },
      { type: 'file', label: 'Logo file', file: { pricePerUnit: 0, multiple: false, askQuantity: false } },
      {
        type: 'radio',
        label: 'Delivery time',
        options: [
          { label: 'Instant Delivery (60 Minutes)', price: 0, default: true, delivery: { instant: true, days: 0 } },
          { label: '2 Days Delivery', price: 0, delivery: { instant: false, days: 2 } }
        ]
      },
      {
        type: 'checkbox_group',
        label: 'Tone',
        options: [
          { label: 'Bold & loud', price: 0 },
          { label: 'Warm & friendly', price: 0 }
        ]
      }
    ]
  }
];

const makeDemo = (item, seed, stamp) => ({
  ...item,
  title: `${item.title} ${seed}`,
  slug: `${item.slug}-${seed}-${stamp}`
});

export const createDemoSeeder = () => {
  let demoSeed = 0;
  const nextDemo = () => {
    demoSeed += 1;
    return makeDemo(demoTemplates[demoSeed % demoTemplates.length], demoSeed, Date.now().toString().slice(-4));
  };
  const seedAll = () => {
    const stamp = Date.now().toString().slice(-4);
    return demoTemplates.map((item, idx) => makeDemo(item, idx + 1, stamp));
  };
  return { nextDemo, seedAll };
};

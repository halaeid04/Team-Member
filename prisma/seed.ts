import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import * as bcrypt from 'bcrypt';
import * as path from 'path';
import { slugify } from '../src/common/utils/slugify';

function createPrisma() {
  const url = process.env['DATABASE_URL'] ?? 'file:./prisma/database.sqlite';
  const filePath = url.replace(/^file:/, '');
  const absolutePath = path.resolve(filePath);
  const adapter = new PrismaBetterSqlite3({ url: absolutePath });
  return new PrismaClient({ adapter } as any);
}

const prisma = createPrisma();

// ---------------------------------------------------------------------------
// Small helpers (Math.random is fine here — this is a one-off seed script).
// ---------------------------------------------------------------------------
const rand = (min: number, max: number) =>
  Math.floor(Math.random() * (max - min + 1)) + min;
const pick = <T>(arr: T[]): T => arr[rand(0, arr.length - 1)];
const round = (n: number) => Math.round(n);

// ---------------------------------------------------------------------------
// Categories
// ---------------------------------------------------------------------------
const categories = [
  { name: 'Headphones', slug: 'headphones' },
  { name: 'Watches', slug: 'watches' },
  { name: 'Hats', slug: 'hats' },
  { name: 'Mobiles', slug: 'mobiles' },
  { name: 'Laptops', slug: 'laptops' },
  { name: 'Accessories', slug: 'accessories' },
  { name: 'Shoes', slug: 'shoes' },
];

// ---------------------------------------------------------------------------
// Per-category bases. Each base is expanded into one product per variant,
// so productCount = bases * variants (currently 5 * 3 = 15 per category).
// ---------------------------------------------------------------------------
type Base = {
  brand: string;
  model: string;
  basePrice: number;
  features: string[];
  // Optional override for the image search keyword (used in mixed
  // categories like Accessories where each base is a different kind of item).
  imageKeyword?: string;
};

type CategoryConfig = {
  slug: string;
  noun: string;
  variants: string[];
  // Keyword used to fetch a matching real photo from LoremFlickr.
  keyword: string;
  bases: Base[];
};

// "About this item" bullet points, shown on the product detail page.
const featurePools: Record<string, string[]> = {
  headphones: [
    'Industry Leading noise cancellation-two processors control 8 microphones for unprecedented noise cancellation. With Auto NC Optimizer, noise cancelling is automatically optimized based on your wearing conditions and environment.',
    'Industry-leading call quality with our Precise Voice Pickup Technology uses four beamforming microphones and an AI-based noise reduction algorithm.',
    'Magnificent Sound, engineered to perfection with the new Integrated Processor V1.',
    'Crystal clear hands-free calling with 4 beamforming microphones, precise voice pickup, and advanced audio signal processing.',
    'Up to 40-hour battery life for continuous music playtime (With Noise Cancellation ON, get up to 30 Hours of playtime, and With Noise Cancellation off get up to 40 Hours). All-day power and quick charging (3 min charge for 3 hours of playback).',
    'Ultra-comfortable, lightweight design with soft fit leather.',
    'Multipoint connection allows you to quickly switch between devices.',
    'Carry your headphones effortlessly in the redesigned case.',
  ],
  watches: [
    'Always-On Retina display that is up to 2x brighter outdoors so it is easy to read even in bright sunlight.',
    'Advanced health features including heart rate notifications, blood oxygen and ECG app to monitor your wellbeing.',
    'Crash Detection and Fall Detection can connect you with emergency services when you need help.',
    'Swimproof and water resistant up to 50 meters so you can take it from the pool to the shower.',
    'All-day battery life of up to 18 hours, with fast charging to get you going quickly.',
    'Built-in GPS for precise distance, pace and route tracking on your outdoor workouts.',
    'A wide range of bands and watch faces so you can personalise it to match your style.',
  ],
  hats: [
    'Made from breathable lightweight fabric that keeps you cool and comfortable all day.',
    'Adjustable strap at the back delivers a secure, customised fit for most head sizes.',
    'Built-in UV protection helps shield your face and eyes on bright sunny days.',
    'Durable stitched construction holds its shape wash after wash.',
    'Versatile design pairs easily with both casual and sporty outfits.',
    'One size fits most for hassle-free everyday wear.',
  ],
  mobiles: [
    'Brilliant Super Retina XDR display with vivid colours and incredible detail, even in bright sunlight.',
    'Pro-grade camera system captures stunning photos and 4K video in any light.',
    'All-day battery life with fast and wireless charging support to keep you powered.',
    'Superfast 5G connectivity for high-speed downloads and smooth streaming on the go.',
    'Fast and secure face unlock keeps your phone and data protected.',
    'Tough ceramic shield front is engineered to be more durable than any smartphone glass.',
    'Built on a powerful, energy-efficient chip for blazing performance and smooth multitasking.',
  ],
  laptops: [
    'Powerful multi-core processor handles everything from everyday tasks to demanding creative workloads.',
    'Stunning high-resolution display with rich colours and sharp detail for work and entertainment.',
    'All-day battery life of up to 18 hours so you can work and play without searching for a charger.',
    'Comfortable backlit keyboard and large precision trackpad for an effortless typing experience.',
    'Fast SSD storage delivers near-instant boot times and quick file transfers.',
    'Thin and lightweight aluminium body that is built to travel and easy to carry anywhere.',
    'Advanced cooling keeps the system quiet and responsive under heavy load.',
  ],
  accessories: [
    'Premium build quality with materials chosen for everyday durability.',
    'Long-lasting battery keeps you powered through the whole day.',
    'Compact and travel-friendly design slips easily into a bag or pocket.',
    'Universal compatibility works seamlessly across your phones, tablets and laptops.',
    'Fast wired and wireless charging support to top up in no time.',
    'Simple, reliable connection with quick and easy setup.',
  ],
  shoes: [
    'Soft responsive foam cushioning delivers all-day comfort with every step.',
    'Breathable mesh upper keeps your feet cool and reduces moisture build-up.',
    'Durable rubber outsole provides reliable grip and long-lasting wear.',
    'Lightweight construction reduces fatigue during long walks and runs.',
    'Secure lace-up fit locks your foot in place for stable support.',
    'Versatile design transitions easily from workouts to casual everyday wear.',
  ],
};

const categoryConfigs: CategoryConfig[] = [
  {
    slug: 'headphones',
    noun: 'Headphones',
    keyword: 'headphones',
    variants: ['Black', 'Silver', 'Midnight Blue'],
    bases: [
      {
        brand: 'Sony',
        model: 'WH-1000XM5',
        basePrice: 28990,
        features: featurePools.headphones,
      },
      {
        brand: 'Sony',
        model: 'WH-1000XM4',
        basePrice: 22990,
        features: featurePools.headphones,
      },
      {
        brand: 'Bose',
        model: 'QuietComfort 45',
        basePrice: 26990,
        features: featurePools.headphones,
      },
      {
        brand: 'JBL',
        model: 'Tour One M2',
        basePrice: 19990,
        features: featurePools.headphones,
      },
      {
        brand: 'Sennheiser',
        model: 'Momentum 4',
        basePrice: 27990,
        features: featurePools.headphones,
      },
    ],
  },
  {
    slug: 'watches',
    noun: 'Smartwatch',
    keyword: 'smartwatch',
    variants: ['40mm', '44mm', '44mm GPS + Cellular'],
    bases: [
      {
        brand: 'Apple',
        model: 'Watch SE 2nd Gen',
        basePrice: 22990,
        features: featurePools.watches,
      },
      {
        brand: 'Apple',
        model: 'Watch Series 9',
        basePrice: 41990,
        features: featurePools.watches,
      },
      {
        brand: 'Samsung',
        model: 'Galaxy Watch 6',
        basePrice: 28999,
        features: featurePools.watches,
      },
      {
        brand: 'Garmin',
        model: 'Venu 3',
        basePrice: 44990,
        features: featurePools.watches,
      },
      {
        brand: 'Fitbit',
        model: 'Versa 4',
        basePrice: 19999,
        features: featurePools.watches,
      },
    ],
  },
  {
    slug: 'hats',
    noun: 'Hat',
    keyword: 'hat',
    variants: ['Black', 'Beige', 'Navy'],
    bases: [
      {
        brand: 'Redsea',
        model: 'Luffy Straw',
        basePrice: 799,
        features: featurePools.hats,
      },
      {
        brand: 'Nike',
        model: 'Dri-FIT Club',
        basePrice: 1295,
        features: featurePools.hats,
      },
      {
        brand: 'Adidas',
        model: 'Trefoil Baseball',
        basePrice: 1199,
        features: featurePools.hats,
      },
      {
        brand: 'New Era',
        model: '9FORTY',
        basePrice: 1799,
        features: featurePools.hats,
      },
      {
        brand: 'Kangol',
        model: 'Bermuda Bucket',
        basePrice: 2499,
        features: featurePools.hats,
      },
    ],
  },
  {
    slug: 'mobiles',
    noun: 'Smartphone',
    keyword: 'smartphone',
    variants: ['128GB', '256GB', '512GB'],
    bases: [
      {
        brand: 'Apple',
        model: 'iPhone 15',
        basePrice: 79900,
        features: featurePools.mobiles,
      },
      {
        brand: 'Apple',
        model: 'iPhone 15 Pro',
        basePrice: 134900,
        features: featurePools.mobiles,
      },
      {
        brand: 'Samsung',
        model: 'Galaxy S24',
        basePrice: 74999,
        features: featurePools.mobiles,
      },
      {
        brand: 'Google',
        model: 'Pixel 8',
        basePrice: 75999,
        features: featurePools.mobiles,
      },
      {
        brand: 'OnePlus',
        model: '12',
        basePrice: 64999,
        features: featurePools.mobiles,
      },
    ],
  },
  {
    slug: 'laptops',
    noun: 'Laptop',
    keyword: 'laptop',
    variants: ['8GB / 256GB', '16GB / 512GB', '16GB / 1TB'],
    bases: [
      {
        brand: 'Apple',
        model: 'MacBook Air M2',
        basePrice: 99990,
        features: featurePools.laptops,
      },
      {
        brand: 'Apple',
        model: 'MacBook Pro 14',
        basePrice: 169990,
        features: featurePools.laptops,
      },
      {
        brand: 'Dell',
        model: 'XPS 13',
        basePrice: 124990,
        features: featurePools.laptops,
      },
      {
        brand: 'HP',
        model: 'Spectre x360',
        basePrice: 139990,
        features: featurePools.laptops,
      },
      {
        brand: 'Lenovo',
        model: 'ThinkPad X1 Carbon',
        basePrice: 149990,
        features: featurePools.laptops,
      },
    ],
  },
  {
    slug: 'accessories',
    noun: '',
    keyword: 'gadget',
    variants: ['Black', 'White', 'Grey'],
    bases: [
      {
        brand: 'Samsung',
        model: 'Galaxy Buds2 Pro',
        basePrice: 11990,
        features: featurePools.accessories,
        imageKeyword: 'earbuds',
      },
      {
        brand: 'Anker',
        model: 'PowerCore 20000mAh Power Bank',
        basePrice: 2999,
        features: featurePools.accessories,
        imageKeyword: 'powerbank',
      },
      {
        brand: 'Logitech',
        model: 'MX Master 3S Mouse',
        basePrice: 8995,
        features: featurePools.accessories,
        imageKeyword: 'computer-mouse',
      },
      {
        brand: 'JBL',
        model: 'Flip 6 Bluetooth Speaker',
        basePrice: 9999,
        features: featurePools.accessories,
        imageKeyword: 'speaker',
      },
      {
        brand: 'Urban Carry',
        model: 'Leather Laptop Backpack',
        basePrice: 4999,
        features: featurePools.accessories,
        imageKeyword: 'backpack',
      },
    ],
  },
  {
    slug: 'shoes',
    noun: 'Shoes',
    keyword: 'sneakers',
    variants: ['UK 7', 'UK 8', 'UK 9'],
    bases: [
      {
        brand: 'Nike',
        model: 'Revolution 7 Running',
        basePrice: 3495,
        features: featurePools.shoes,
      },
      {
        brand: 'Adidas',
        model: 'Ultraboost Light',
        basePrice: 8999,
        features: featurePools.shoes,
      },
      {
        brand: 'Puma',
        model: 'RS-X Efekt',
        basePrice: 6499,
        features: featurePools.shoes,
      },
      {
        brand: 'Reebok',
        model: 'Nano X3',
        basePrice: 7499,
        features: featurePools.shoes,
      },
      {
        brand: 'New Balance',
        model: '574 Core',
        basePrice: 5999,
        features: featurePools.shoes,
      },
    ],
  },
];

// ---------------------------------------------------------------------------
// Review content pools
// ---------------------------------------------------------------------------
const reviewerNames = [
  'Vijaya',
  'Arun',
  'Meera',
  'Karthik',
  'Divya',
  'Sanjay',
  'Nidhi',
  'Rahul',
  'Pooja',
  'Imran',
  'Anjali',
  'Vikram',
  'Sneha',
  'Deepak',
  'Farhan',
  'Priya',
  'Rohit',
  'Lakshmi',
  'Aditya',
  'Kavya',
];

const reviewComments = [
  'Excellent quality, exceeded my expectations.',
  'Great value for the price.',
  'Works exactly as described, very happy.',
  'Good product but delivery was slow.',
  'Comfortable and well built.',
  'Battery life is impressive.',
  'Decent, but could be better for the price.',
  'Absolutely love it, would buy again.',
  'Solid performance, no complaints.',
  'Not bad, does the job.',
];

const reviewTitles = [
  'Highly recommended',
  'Worth it',
  'Very good',
  'Could be better',
  'Amazing product',
  'Satisfied',
  'Great buy',
  undefined,
];

// Weighted toward positive ratings, like a real store.
const ratingPool = [5, 5, 5, 5, 4, 4, 4, 3, 3, 2];

const discountChoices = [0, 0, 5, 10, 15, 20, 25, 30, 38];

const userAddresses = [
  {
    name: 'Nandhu Santhosh',
    country: 'India',
    flatHouseBuilding: 'Munjanattu House',
    mobileNumber: '6238973581',
    alternativeMobileNumber: '8078785794',
    pincode: '689667',
    city: 'Seethathodu',
    state: 'Kerala',
    isDefault: true,
  },
  {
    name: 'Nandhu Santhosh (Office)',
    country: 'India',
    flatHouseBuilding: 'Tech Park, Tower B',
    mobileNumber: '6238973581',
    pincode: '560103',
    city: 'Bengaluru',
    state: 'Karnataka',
    isDefault: false,
  },
];

// ---------------------------------------------------------------------------
// Build the product list from the category configs.
// ---------------------------------------------------------------------------
type GeneratedProduct = {
  categorySlug: string;
  title: string;
  slug: string;
  brand: string;
  description: string;
  price: number;
  oldPrice: number | null;
  discountPercent: number | null;
  stock: number;
  isTodayDeal: boolean;
  isRecommended: boolean;
  ratingAverage: number;
  ratingCount: number;
  images: { url: string; alt: string; sortOrder: number }[];
  features: { text: string; sortOrder: number }[];
  reviews: {
    reviewerName: string;
    rating: number;
    title?: string;
    comment: string;
    isVerified: boolean;
  }[];
};

function buildProducts(): GeneratedProduct[] {
  const products: GeneratedProduct[] = [];
  const usedSlugs = new Set<string>();
  let counter = 0;

  for (const cfg of categoryConfigs) {
    for (const base of cfg.bases) {
      cfg.variants.forEach((variant, variantIndex) => {
        counter += 1;

        const titleParts = [base.brand, base.model, cfg.noun, `(${variant})`]
          .filter(Boolean)
          .join(' ')
          .replace(/\s+/g, ' ')
          .trim();
        const title = titleParts;

        // Unique slug
        let slug = slugify(`${base.brand} ${base.model} ${variant}`);
        if (usedSlugs.has(slug)) {
          slug = `${slug}-${counter}`;
        }
        usedSlugs.add(slug);

        // Pricing: nudge price per variant, then apply a random discount.
        const price = round(base.basePrice * (1 + variantIndex * 0.08));
        const discountPercent = pick(discountChoices);
        const oldPrice =
          discountPercent > 0
            ? round(price / (1 - discountPercent / 100))
            : null;

        // Reviews
        const reviewCount = rand(0, 6);
        const reviews = Array.from({ length: reviewCount }, () => {
          const rating = pick(ratingPool);
          return {
            reviewerName: pick(reviewerNames),
            rating,
            title: pick(reviewTitles),
            comment: pick(reviewComments),
            isVerified: Math.random() > 0.4,
          };
        });
        const ratingCount = reviews.length;
        const ratingAverage =
          ratingCount === 0
            ? 0
            : Math.round(
                (reviews.reduce((acc, r) => acc + r.rating, 0) / ratingCount) *
                  10,
              ) / 10;

        // Images (1-3 per product) from LoremFlickr — real photos matched to
        // the category keyword. The `lock` seed makes each image deterministic
        // so a product always shows the same picture across requests.
        const imageKeyword = base.imageKeyword ?? cfg.keyword;
        // At least 3 images per product (3-5). Duplicate keywords across
        // products are fine — LoremFlickr varies the photo by `lock` seed.
        const imageCount = rand(3, 5);
        const images = Array.from({ length: imageCount }, (_, i) => ({
          url: `https://loremflickr.com/600/600/${imageKeyword}?lock=${counter * 10 + i + 1}`,
          alt: `${base.brand} ${base.model} ${variant}`,
          sortOrder: i + 1,
        }));

        // "About this item" — seed the full bullet list, in order, for every
        // product so the detail page always has rich content.
        const features = base.features.map((text, i) => ({
          text,
          sortOrder: i + 1,
        }));

        products.push({
          categorySlug: cfg.slug,
          title,
          slug,
          brand: base.brand,
          description:
            `${base.brand} ${base.model} ${cfg.noun} (${variant}). ${base.features[0]} ${base.features[1] ?? ''}`.trim(),
          price,
          oldPrice,
          discountPercent: discountPercent > 0 ? discountPercent : null,
          stock: rand(0, 120),
          // Distribute landing-page flags so /home always has content.
          isTodayDeal: counter % 4 === 0,
          isRecommended: counter % 3 === 0,
          ratingAverage,
          ratingCount,
          images,
          features,
          reviews,
        });
      });
    }
  }

  return products;
}

async function main() {
  console.log('Seeding e-commerce database...');

  // Clean slate (order matters for FK constraints).
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.cartItem.deleteMany();
  await prisma.review.deleteMany();
  await prisma.productFeature.deleteMany();
  await prisma.productImage.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.address.deleteMany();
  await prisma.user.deleteMany();

  // Reset SQLite AUTOINCREMENT counters so IDs are deterministic on every
  // re-seed (category 1 = Headphones, product ids start at 1, etc.).
  try {
    await prisma.$executeRawUnsafe(
      `DELETE FROM sqlite_sequence WHERE name IN ('User','Address','Category','Product','ProductImage','ProductFeature','Review','CartItem','Order','OrderItem')`,
    );
  } catch {
    // sqlite_sequence may not exist yet on a brand-new database — safe to ignore.
  }

  // Categories
  const categoryIdBySlug: Record<string, number> = {};
  for (const category of categories) {
    const created = await prisma.category.create({ data: category });
    categoryIdBySlug[created.slug] = created.id;
  }

  // Products + images + features + reviews
  const products = buildProducts();
  for (const product of products) {
    await prisma.product.create({
      data: {
        categoryId: categoryIdBySlug[product.categorySlug],
        title: product.title,
        slug: product.slug,
        brand: product.brand,
        description: product.description,
        price: product.price,
        oldPrice: product.oldPrice,
        discountPercent: product.discountPercent,
        stock: product.stock,
        isTodayDeal: product.isTodayDeal,
        isRecommended: product.isRecommended,
        ratingAverage: product.ratingAverage,
        ratingCount: product.ratingCount,
        images: { create: product.images },
        features: { create: product.features },
        reviews: { create: product.reviews },
      },
    });
  }

  // Test user + addresses
  const user = await prisma.user.create({
    data: {
      fullName: 'Nandhu Santhosh',
      email: 'nandhusanthosh@gmail.com',
      passwordHash: await bcrypt.hash('12345678', 10),
      phone: '6238973581',
      dateOfBirth: new Date('2002-09-18'),
      addresses: { create: userAddresses },
    },
  });

  // Cart + orders for the test user so /cart and /orders have content.
  const shipToName = userAddresses[0].name;
  const sampleProducts = await prisma.product.findMany({
    orderBy: { id: 'asc' },
    take: 3,
    include: { images: { orderBy: { sortOrder: 'asc' }, take: 1 } },
  });

  const orderNumber = () => {
    const part = (length: number) =>
      Array.from({ length }, () => rand(0, 9)).join('');
    return `${part(3)}-${part(7)}-${part(7)}`;
  };

  if (sampleProducts.length > 0) {
    // A live cart with the first two products.
    await prisma.cartItem.createMany({
      data: sampleProducts.slice(0, 2).map((p) => ({
        userId: user.id,
        productId: p.id,
        quantity: rand(1, 2),
      })),
    });

    // Two past orders, each with one product.
    for (const product of sampleProducts.slice(0, 2)) {
      const quantity = rand(1, 2);
      const lineTotal = round(product.price * quantity);
      await prisma.order.create({
        data: {
          userId: user.id,
          orderNumber: orderNumber(),
          status: 'PROCESSING',
          subtotal: lineTotal,
          total: lineTotal,
          shipToName,
          items: {
            create: [
              {
                productId: product.id,
                title: product.title,
                image: product.images[0]?.url ?? null,
                price: product.price,
                quantity,
              },
            ],
          },
        },
      });
    }
  }

  const todayDeals = products.filter((p) => p.isTodayDeal).length;
  const recommended = products.filter((p) => p.isRecommended).length;
  console.log(`Categories seeded: ${categories.length}`);
  console.log(`Products seeded: ${products.length}`);
  console.log(`  - today deals: ${todayDeals}`);
  console.log(`  - recommended: ${recommended}`);
  console.log(`Test user: ${user.email} / 12345678`);
  console.log(`  - cart items: ${Math.min(2, sampleProducts.length)}`);
  console.log(`  - orders: ${Math.min(2, sampleProducts.length)}`);
  console.log('Seed completed successfully!');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

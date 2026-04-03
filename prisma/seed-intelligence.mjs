import 'dotenv/config';
import pg from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);

const clientMod = await import('../src/generated/prisma/client.ts');
const { PrismaClient } = clientMod.default || clientMod;
const prisma = new PrismaClient({ adapter });

const intelligenceData = [
  // ─── Iranian Cars ─────────────────────────────────
  {
    nameEn: "Iran Khodro Tara",
    acceleration: 5,
    depreciation: 4,
    repairCost: 3,
    secondHandMarket: 7,
    priceDropRate: 4,
    buildQuality: 5,
    afterSalesService: 6,
    ownerSatisfaction: 6,
    purchaseRisk: 4,
    fuelEconomy: 7,
    suitFamily: 6,
    suitCity: 8,
    suitTravel: 5,
    suitYoung: 6,
    suitInvestment: 6,
    frequentPros: [
      "طراحی مدرن و به‌روز نسبت به سایر محصولات داخلی",
      "گیربکس CVT روان و کم‌مصرف",
      "فضای داخلی مناسب برای سدان",
      "قیمت مناسب نسبت به امکانات"
    ],
    frequentCons: [
      "کیفیت پلاستیک‌های داخلی پایین",
      "عایق صوتی ضعیف در سرعت‌های بالا",
      "سیستم مالتی‌مدیا کند",
      "رنگ بدنه حساس به خط‌وخش"
    ],
    commonIssues: [
      "مشکلات گیربکس CVT در دمای بالا",
      "خرابی سنسورهای موتور",
      "نشتی واشر سرسیلندر در برخی مدل‌ها"
    ],
    purchaseWarnings: [
      "حتماً گیربکس را در ترافیک سنگین تست کنید",
      "سرویس‌های دوره‌ای را از نمایندگی انجام دهید"
    ],
    ownerVerdict: "ماشین خوبی برای قیمتش هست ولی نباید انتظار کیفیت اروپایی داشت.",
    overallSummary: "تارا بهترین انتخاب در بین سدان‌های داخلی با ترکیب مناسبی از امکانات و قیمت است، اما کیفیت ساخت هنوز جای بهبود دارد.",
    whyBuy: "اگر بودجه محدود دارید و یک سدان مدرن داخلی با گیربکس اتوماتیک می‌خواهید، تارا بهترین گزینه است.",
    whyNotBuy: "اگر انتظار کیفیت ساخت و دوام بالا دارید یا مسافرت‌های طولانی زیاد می‌روید، گزینه‌های بهتری وجود دارد."
  },
  {
    nameEn: "Iran Khodro Dena Plus Turbo",
    acceleration: 6,
    depreciation: 4,
    repairCost: 3,
    secondHandMarket: 7,
    priceDropRate: 4,
    buildQuality: 5,
    afterSalesService: 6,
    ownerSatisfaction: 6,
    purchaseRisk: 5,
    fuelEconomy: 6,
    suitFamily: 6,
    suitCity: 7,
    suitTravel: 5,
    suitYoung: 7,
    suitInvestment: 6,
    frequentPros: [
      "موتور توربو قدرتمند برای یک خودروی داخلی",
      "شتاب مناسب و عملکرد خوب در اتوبان",
      "صندوق عقب بزرگ",
      "قطعات یدکی فراوان و ارزان"
    ],
    frequentCons: [
      "مصرف سوخت بالاتر از حد انتظار",
      "کیفیت رنگ و بدنه متوسط",
      "صدای موتور در دور بالا زیاد",
      "تعلیق سفت و ناراحت در جاده‌های ناهموار"
    ],
    commonIssues: [
      "مشکلات توربو در کیلومتر بالا",
      "خرابی واترپمپ",
      "روغن‌ریزی موتور در برخی مدل‌ها"
    ],
    purchaseWarnings: [
      "توربو را حتماً قبل از خرید چک کنید",
      "کارکرد بالای ۱۰۰ هزار نیاز به بررسی دقیق‌تر دارد"
    ],
    ownerVerdict: "ماشین سریعی برای قیمتش هست، ولی باید هزینه نگهداری توربو رو هم حساب کنی.",
    overallSummary: "دنا پلاس توربو برای کسانی که شتاب و قدرت موتور برایشان مهم است گزینه جذابی در بازار داخلی است، اما هزینه نگهداری توربو را باید در نظر گرفت.",
    whyBuy: "اگر دنبال یک سدان داخلی با موتور قوی و شتاب خوب هستید و بودجه خرید خارجی ندارید.",
    whyNotBuy: "اگر مصرف سوخت پایین و هزینه نگهداری کم برایتان اولویت دارد."
  },
  {
    nameEn: "SAIPA Shahin",
    acceleration: 4,
    depreciation: 4,
    repairCost: 3,
    secondHandMarket: 6,
    priceDropRate: 5,
    buildQuality: 4,
    afterSalesService: 4,
    ownerSatisfaction: 5,
    purchaseRisk: 5,
    fuelEconomy: 7,
    suitFamily: 5,
    suitCity: 7,
    suitTravel: 4,
    suitYoung: 6,
    suitInvestment: 5,
    frequentPros: [
      "طراحی ظاهری مدرن و جذاب",
      "مصرف سوخت اقتصادی",
      "قیمت پایین نسبت به رقبا",
      "گیربکس CVT نسبتاً روان"
    ],
    frequentCons: [
      "کیفیت ساخت داخلی ضعیف",
      "خدمات پس از فروش سایپا ضعیف",
      "صداگیری بد",
      "عملکرد ضعیف تهویه مطبوع"
    ],
    commonIssues: [
      "مشکلات برقی و سیم‌کشی",
      "خرابی گیربکس CVT",
      "لرزش فرمان در سرعت بالا"
    ],
    purchaseWarnings: [
      "خدمات پس از فروش سایپا را در نظر بگیرید",
      "حتماً تست فنی کامل انجام دهید"
    ],
    ownerVerdict: "برای قیمتش بد نیست ولی کیفیت سایپا همیشه نگران‌کننده‌ست.",
    overallSummary: "شاهین تلاش سایپا برای ارائه یک سدان مدرن است که ظاهر خوبی دارد اما کیفیت ساخت و خدمات پس از فروش همچنان چالش اصلی آن است.",
    whyBuy: "اگر بودجه خیلی محدودی دارید و ظاهر ماشین برایتان مهم است.",
    whyNotBuy: "اگر دوام و کیفیت ساخت برایتان مهم‌تر از قیمت است."
  },
  {
    nameEn: "SAIPA Quick R",
    acceleration: 5,
    depreciation: 4,
    repairCost: 2,
    secondHandMarket: 6,
    priceDropRate: 5,
    buildQuality: 3,
    afterSalesService: 4,
    ownerSatisfaction: 5,
    purchaseRisk: 5,
    fuelEconomy: 8,
    suitFamily: 3,
    suitCity: 9,
    suitTravel: 3,
    suitYoung: 8,
    suitInvestment: 4,
    frequentPros: [
      "مصرف سوخت بسیار پایین",
      "قیمت خرید و نگهداری ارزان",
      "ابعاد کوچک مناسب شهر و پارک",
      "شتاب قابل‌قبول برای رانندگی شهری"
    ],
    frequentCons: [
      "فضای داخلی بسیار کوچک",
      "ایمنی پایین",
      "کیفیت متریال داخلی بسیار ضعیف",
      "نامناسب برای مسافرت و بزرگراه"
    ],
    commonIssues: [
      "لرزش بدنه در سرعت بالا",
      "خرابی کلاچ در مدل دستی",
      "مشکلات سیستم برقی"
    ],
    purchaseWarnings: [
      "فقط برای استفاده شهری مناسب است",
      "ایمنی پایین را حتماً در نظر بگیرید"
    ],
    ownerVerdict: "برای رفت‌وآمد شهری خوبه ولی بیشتر از این ازش انتظار نداشته باشید.",
    overallSummary: "کوییک آر یک هاچبک اقتصادی برای تردد شهری است که قیمت پایین و مصرف کم دارد اما از نظر ایمنی و راحتی محدودیت‌های جدی دارد.",
    whyBuy: "اگر فقط یک ماشین شهری ارزان برای رفت‌وآمد روزانه می‌خواهید.",
    whyNotBuy: "اگر خانواده دارید یا مسافرت زیاد می‌روید یا ایمنی برایتان مهم است."
  },
  {
    nameEn: "Iran Khodro Peugeot 207i",
    acceleration: 5,
    depreciation: 4,
    repairCost: 3,
    secondHandMarket: 8,
    priceDropRate: 3,
    buildQuality: 5,
    afterSalesService: 6,
    ownerSatisfaction: 6,
    purchaseRisk: 4,
    fuelEconomy: 7,
    suitFamily: 4,
    suitCity: 8,
    suitTravel: 4,
    suitYoung: 8,
    suitInvestment: 6,
    frequentPros: [
      "نقدشوندگی بسیار بالا در بازار",
      "موتور TU5 اثبات‌شده و قابل‌اعتماد",
      "رانندگی لذت‌بخش در شهر",
      "طراحی فرانسوی جذاب"
    ],
    frequentCons: [
      "فضای عقب تنگ",
      "صندوق عقب کوچک",
      "قطعات الکترونیکی حساس",
      "تعلیق سفت روی دست‌انداز"
    ],
    commonIssues: [
      "خرابی دسته‌موتور",
      "مشکلات کوئل و شمع",
      "نشتی روغن از درب سوپاپ"
    ],
    purchaseWarnings: [
      "رنگ‌شدگی بدنه را دقیق بررسی کنید",
      "مدل اتوماتیک حتماً تست گیربکس بشود"
    ],
    ownerVerdict: "هاچبک محبوب و باصفا، مخصوصاً برای جوان‌ها عالیه.",
    overallSummary: "پژو ۲۰۷ یکی از محبوب‌ترین هاچبک‌های بازار ایران است که نقدشوندگی بالا و رانندگی لذت‌بخشی دارد اما فضای محدودی برای سرنشینان عقب فراهم می‌کند.",
    whyBuy: "اگر یک هاچبک شهری باصفا با بازار فروش عالی می‌خواهید.",
    whyNotBuy: "اگر فضای داخلی بزرگ و صندوق عقب جادار برایتان مهم است."
  },
  {
    nameEn: "Iran Khodro Haima S7 Turbo",
    acceleration: 6,
    depreciation: 5,
    repairCost: 5,
    secondHandMarket: 5,
    priceDropRate: 6,
    buildQuality: 5,
    afterSalesService: 5,
    ownerSatisfaction: 6,
    purchaseRisk: 6,
    fuelEconomy: 4,
    suitFamily: 8,
    suitCity: 5,
    suitTravel: 7,
    suitYoung: 4,
    suitInvestment: 4,
    frequentPros: [
      "فضای داخلی بزرگ و راحت",
      "موتور توربو قدرتمند",
      "مناسب برای خانواده",
      "تجهیزات رفاهی قابل‌قبول"
    ],
    frequentCons: [
      "مصرف سوخت بالا",
      "قطعات یدکی گران و کمیاب",
      "افت قیمت زیاد در بازار دست‌دوم",
      "کیفیت رنگ بدنه ضعیف"
    ],
    commonIssues: [
      "خرابی توربو بعد از ۸۰ هزار کیلومتر",
      "مشکلات گیربکس اتوماتیک",
      "خوردگی زیر بدنه"
    ],
    purchaseWarnings: [
      "قیمت قطعات توربو را از قبل بررسی کنید",
      "سابقه سرویس‌کاری را حتماً ببینید",
      "با مکانیک آشنا به هایما بررسی شود"
    ],
    ownerVerdict: "ماشین خانوادگی خوبی‌ه ولی هزینه نگهداریش بالاتر از انتظاره.",
    overallSummary: "هایما S7 یک شاسی‌بلند خانوادگی با فضای خوب و موتور قوی است اما هزینه نگهداری و افت قیمت بالایی دارد.",
    whyBuy: "اگر یک شاسی‌بلند خانوادگی با بودجه متوسط می‌خواهید و فضای داخلی اولویت شماست.",
    whyNotBuy: "اگر هزینه نگهداری پایین و حفظ ارزش ماشین برایتان مهم است."
  },
  {
    nameEn: "Iran Khodro Haima S8",
    acceleration: 6,
    depreciation: 6,
    repairCost: 6,
    secondHandMarket: 4,
    priceDropRate: 7,
    buildQuality: 6,
    afterSalesService: 5,
    ownerSatisfaction: 6,
    purchaseRisk: 7,
    fuelEconomy: 3,
    suitFamily: 8,
    suitCity: 4,
    suitTravel: 7,
    suitYoung: 3,
    suitInvestment: 3,
    frequentPros: [
      "فضای داخلی بسیار بزرگ و ۷ نفره",
      "امکانات رفاهی و لوکس کامل",
      "موتور توربو با گشتاور بالا",
      "طراحی ظاهری شیک"
    ],
    frequentCons: [
      "مصرف سوخت خیلی بالا",
      "افت قیمت شدید",
      "قطعات یدکی بسیار گران",
      "ابعاد بزرگ و مانور سخت در شهر"
    ],
    commonIssues: [
      "خرابی سیستم تعلیق",
      "مشکلات الکترونیکی و سنسورها",
      "خرابی توربوشارژ",
      "نشتی روغن گیربکس"
    ],
    purchaseWarnings: [
      "از نظر مالی برای نگهداری بلندمدت آماده باشید",
      "بازار فروش دست‌دوم ضعیف است",
      "حتماً با کارشناس مجرب بررسی شود"
    ],
    ownerVerdict: "ماشین لوکسی‌ه ولی جیبت باید پُر باشه برای نگهداریش.",
    overallSummary: "هایما S8 لوکس‌ترین محصول ایران‌خودرو با فضای ۷ نفره است اما افت قیمت شدید و هزینه نگهداری بالا ریسک خرید آن را بالا می‌برد.",
    whyBuy: "اگر یک خودروی ۷ نفره لوکس داخلی می‌خواهید و بودجه نگهداری دارید.",
    whyNotBuy: "اگر نگران افت ارزش سرمایه هستید یا بودجه نگهداری محدودی دارید."
  },
  {
    nameEn: "SAIPA Rira",
    acceleration: 5,
    depreciation: 5,
    repairCost: 4,
    secondHandMarket: 4,
    priceDropRate: 6,
    buildQuality: 4,
    afterSalesService: 4,
    ownerSatisfaction: 5,
    purchaseRisk: 6,
    fuelEconomy: 5,
    suitFamily: 5,
    suitCity: 6,
    suitTravel: 5,
    suitYoung: 6,
    suitInvestment: 3,
    frequentPros: [
      "طراحی ظاهری جذاب و مدرن",
      "فضای داخلی مناسب برای کلاسش",
      "موتور توربو با شتاب قبول",
      "آپشن‌های رفاهی خوب"
    ],
    frequentCons: [
      "خدمات پس از فروش سایپا ضعیف",
      "کیفیت ساخت متوسط",
      "افت قیمت زیاد",
      "قطعات یدکی محدود"
    ],
    commonIssues: [
      "مشکلات نرم‌افزاری سیستم مالتی‌مدیا",
      "خرابی سنسور پارک",
      "صدای تعلیق روی دست‌انداز"
    ],
    purchaseWarnings: [
      "محصول جدید و ثابت‌نشده‌ای است",
      "بازار دست‌دوم هنوز شکل نگرفته"
    ],
    ownerVerdict: "ظاهرش قشنگه ولی باید صبر کرد ببینیم کیفیتش چطور از آب درمیاد.",
    overallSummary: "ریرا محصول جدید سایپا با طراحی مدرن است اما به دلیل جدید بودن و سابقه ضعیف سایپا در کیفیت، خرید آن ریسک دارد.",
    whyBuy: "اگر طراحی مدرن می‌خواهید و حاضرید ریسک محصول جدید را بپذیرید.",
    whyNotBuy: "اگر امنیت سرمایه‌گذاری و اطمینان از کیفیت برایتان مهم‌تر است."
  },
  {
    nameEn: "Iran Khodro Peugeot Pars",
    acceleration: 4,
    depreciation: 3,
    repairCost: 2,
    secondHandMarket: 9,
    priceDropRate: 3,
    buildQuality: 4,
    afterSalesService: 7,
    ownerSatisfaction: 6,
    purchaseRisk: 3,
    fuelEconomy: 5,
    suitFamily: 5,
    suitCity: 7,
    suitTravel: 5,
    suitYoung: 4,
    suitInvestment: 7,
    frequentPros: [
      "نقدشوندگی فوق‌العاده بالا",
      "قطعات یدکی فراوان و بسیار ارزان",
      "هر مکانیکی می‌تواند تعمیرش کند",
      "حفظ ارزش خوب در بازار",
      "هزینه نگهداری پایین"
    ],
    frequentCons: [
      "طراحی قدیمی و منسوخ",
      "ایمنی پایین (فاقد ایربگ‌های جانبی)",
      "تکنولوژی و امکانات منسوخ",
      "مصرف سوخت بالا با موتور XU7"
    ],
    commonIssues: [
      "خوردگی گلگیر و درب‌ها",
      "مشکلات سیستم سوخت‌رسانی",
      "فرسودگی تعلیق جلو"
    ],
    purchaseWarnings: [
      "فقط برای استفاده اقتصادی و نقدشوندگی بخرید",
      "ایمنی پایین را جدی بگیرید"
    ],
    ownerVerdict: "ماشین بی‌دردسر و پول‌ساز، ولی دیگه قدیمی شده.",
    overallSummary: "پژو پارس یک انتخاب اقتصادی و مطمئن با نقدشوندگی فوق‌العاده است اما از نظر ایمنی و تکنولوژی کاملاً منسوخ شده.",
    whyBuy: "اگر دنبال یک ماشین بی‌دردسر با هزینه نگهداری حداقلی و فروش آسان هستید.",
    whyNotBuy: "اگر ایمنی، طراحی مدرن و امکانات به‌روز برایتان مهم است."
  },
  {
    nameEn: "Iran Khodro Samand Soren",
    acceleration: 4,
    depreciation: 3,
    repairCost: 2,
    secondHandMarket: 8,
    priceDropRate: 3,
    buildQuality: 4,
    afterSalesService: 7,
    ownerSatisfaction: 5,
    purchaseRisk: 3,
    fuelEconomy: 5,
    suitFamily: 5,
    suitCity: 6,
    suitTravel: 5,
    suitYoung: 3,
    suitInvestment: 6,
    frequentPros: [
      "قیمت خرید بسیار پایین",
      "هزینه نگهداری و تعمیر ناچیز",
      "قطعات یدکی در همه‌جا موجود",
      "نقدشوندگی خوب"
    ],
    frequentCons: [
      "طراحی بسیار قدیمی",
      "ایمنی پایین",
      "مصرف سوخت بالا",
      "فقدان امکانات رفاهی مدرن",
      "صداگیری بسیار ضعیف"
    ],
    commonIssues: [
      "خوردگی بدنه مخصوصاً در مناطق مرطوب",
      "مشکلات سیستم خنک‌کننده",
      "فرسودگی زودرس لاستیک و ترمز"
    ],
    purchaseWarnings: [
      "فقط برای استفاده اقتصادی کوتاه‌مدت مناسب است",
      "ایمنی بسیار پایین دارد"
    ],
    ownerVerdict: "ماشین کار و بار و بی‌ادعاست، توقع زیاد نداشته باش.",
    overallSummary: "سمند سورن ارزان‌ترین سدان قابل‌خرید بازار است که فقط برای تردد اقتصادی و روزمره مناسب است و از نظر ایمنی و راحتی بسیار ضعیف عمل می‌کند.",
    whyBuy: "اگر کمترین بودجه ممکن را دارید و فقط یک وسیله نقلیه نیاز دارید.",
    whyNotBuy: "اگر کمترین توقعی از ایمنی، راحتی یا ظاهر ماشین دارید."
  },

  // ─── Chinese Cars ─────────────────────────────────
  {
    nameEn: "MVM X33 S",
    acceleration: 5,
    depreciation: 6,
    repairCost: 5,
    secondHandMarket: 5,
    priceDropRate: 6,
    buildQuality: 5,
    afterSalesService: 4,
    ownerSatisfaction: 5,
    purchaseRisk: 6,
    fuelEconomy: 6,
    suitFamily: 6,
    suitCity: 6,
    suitTravel: 5,
    suitYoung: 5,
    suitInvestment: 4,
    frequentPros: [
      "قیمت مناسب برای یک کراس‌اوور",
      "امکانات رفاهی خوب نسبت به قیمت",
      "فضای داخلی قابل‌قبول",
      "طراحی ظاهری مدرن"
    ],
    frequentCons: [
      "افت قیمت زیاد در بازار دست‌دوم",
      "کیفیت متریال داخلی متوسط",
      "خدمات پس از فروش ضعیف",
      "عایق صوتی ضعیف"
    ],
    commonIssues: [
      "مشکلات گیربکس CVT",
      "خرابی سنسورهای پارک",
      "نشتی روغن موتور"
    ],
    purchaseWarnings: [
      "بازار فروش دست‌دوم ضعیف است",
      "قطعات یدکی ممکن است دیر برسد"
    ],
    ownerVerdict: "برای قیمتش آپشن‌های خوبی داره ولی کیفیتش نگران‌کننده‌ست.",
    overallSummary: "MVM X33 S یک کراس‌اوور مقرون‌به‌صرفه با امکانات مناسب است اما افت قیمت و کیفیت ساخت متوسط از نقاط ضعف اصلی آن است.",
    whyBuy: "اگر با بودجه محدود یک کراس‌اوور با آپشن‌های خوب می‌خواهید.",
    whyNotBuy: "اگر حفظ ارزش سرمایه و خدمات پس از فروش قوی برایتان مهم است."
  },
  {
    nameEn: "MVM X55 Pro",
    acceleration: 6,
    depreciation: 6,
    repairCost: 5,
    secondHandMarket: 5,
    priceDropRate: 6,
    buildQuality: 6,
    afterSalesService: 4,
    ownerSatisfaction: 6,
    purchaseRisk: 6,
    fuelEconomy: 5,
    suitFamily: 7,
    suitCity: 5,
    suitTravel: 7,
    suitYoung: 5,
    suitInvestment: 4,
    frequentPros: [
      "فضای داخلی بزرگ و راحت",
      "امکانات رفاهی و فناورانه کامل",
      "طراحی ظاهری شیک",
      "عملکرد موتور توربو مناسب"
    ],
    frequentCons: [
      "مصرف سوخت بالا",
      "افت قیمت شدید",
      "خدمات پس از فروش متوسط",
      "وزن بالا و مانور سخت"
    ],
    commonIssues: [
      "مشکلات سیستم مالتی‌مدیا",
      "خرابی دوربین‌های ۳۶۰ درجه",
      "صدای تعلیق عقب"
    ],
    purchaseWarnings: [
      "افت قیمت سالانه بالاست",
      "قبل از خرید حتماً نمایندگی‌های فعال را بررسی کنید"
    ],
    ownerVerdict: "ماشین خوب و پرامکاناتی‌ه ولی وقت فروش ضرر می‌کنی.",
    overallSummary: "MVM X55 Pro شاسی‌بلندی با امکانات لوکس و فضای بزرگ است اما افت قیمت شدید و خدمات پس از فروش متوسط چالش‌های اصلی آن هستند.",
    whyBuy: "اگر فضای بزرگ و امکانات لوکس با قیمت مناسب‌تر از رقبای کره‌ای می‌خواهید.",
    whyNotBuy: "اگر قصد فروش در آینده نزدیک دارید و نگران افت ارزش هستید."
  },
  {
    nameEn: "Chery Tiggo 7 Pro",
    acceleration: 7,
    depreciation: 5,
    repairCost: 5,
    secondHandMarket: 6,
    priceDropRate: 5,
    buildQuality: 7,
    afterSalesService: 5,
    ownerSatisfaction: 7,
    purchaseRisk: 5,
    fuelEconomy: 5,
    suitFamily: 7,
    suitCity: 6,
    suitTravel: 7,
    suitYoung: 7,
    suitInvestment: 5,
    frequentPros: [
      "کیفیت ساخت بالا برای یک چینی",
      "تکنولوژی و امکانات پیشرفته",
      "طراحی داخلی و خارجی جذاب",
      "عملکرد موتور توربو عالی",
      "سیستم ایمنی مناسب"
    ],
    frequentCons: [
      "قیمت بالا نسبت به سایر چینی‌ها",
      "مصرف سوخت متوسط",
      "قطعات یدکی گران",
      "افت قیمت نسبتاً زیاد"
    ],
    commonIssues: [
      "مشکلات نرم‌افزار سیستم اینفوتینمنت",
      "صدای ترمز عقب",
      "خرابی سنسور باران"
    ],
    purchaseWarnings: [
      "قیمت قطعات یدکی را از قبل استعلام بگیرید",
      "نمایندگی فعال در شهرتان داشته باشد"
    ],
    ownerVerdict: "بهترین چینی بازار ایرانه، کیفیتش واقعاً خوبه.",
    overallSummary: "تیگو ۷ پرو یکی از بهترین خودروهای چینی بازار ایران با کیفیت ساخت بالا و امکانات پیشرفته است، هرچند قیمت و هزینه قطعات بالاتری دارد.",
    whyBuy: "اگر یک شاسی‌بلند باکیفیت و پرامکانات می‌خواهید و بودجه کره‌ای ندارید.",
    whyNotBuy: "اگر حفظ ارزش بلندمدت و خدمات پس از فروش گسترده اولویت شماست."
  },
  {
    nameEn: "Chery Tiggo 8 Pro",
    acceleration: 7,
    depreciation: 6,
    repairCost: 6,
    secondHandMarket: 5,
    priceDropRate: 6,
    buildQuality: 7,
    afterSalesService: 5,
    ownerSatisfaction: 7,
    purchaseRisk: 6,
    fuelEconomy: 4,
    suitFamily: 9,
    suitCity: 4,
    suitTravel: 8,
    suitYoung: 4,
    suitInvestment: 4,
    frequentPros: [
      "فضای ۷ نفره واقعی و راحت",
      "موتور توربو قوی و پاسخگو",
      "امکانات رفاهی و ایمنی کامل",
      "کیفیت ساخت بالا",
      "طراحی لوکس داخلی"
    ],
    frequentCons: [
      "مصرف سوخت بالا",
      "ابعاد بزرگ و مانور سخت در شهر",
      "هزینه سرویس و نگهداری بالا",
      "افت قیمت قابل‌توجه"
    ],
    commonIssues: [
      "مشکلات گیربکس دوکلاچه در ترافیک",
      "خرابی سیستم استارت-استاپ",
      "صدای باد از درزگیرها در سرعت بالا"
    ],
    purchaseWarnings: [
      "مصرف سوخت واقعی بالاتر از ادعای شرکت است",
      "هزینه سرویس ۷ نفره بالاتر است"
    ],
    ownerVerdict: "بهترین ماشین ۷ نفره بازار با این قیمت، ولی هزینه‌هاش بالاست.",
    overallSummary: "تیگو ۸ پرو بهترین گزینه ۷ نفره چینی بازار ایران با کیفیت و امکانات عالی است اما هزینه نگهداری و مصرف سوخت بالایی دارد.",
    whyBuy: "اگر یک خودروی ۷ نفره باکیفیت و لوکس با قیمت معقول می‌خواهید.",
    whyNotBuy: "اگر مصرف سوخت پایین یا ماشین کوچک و چابک شهری نیاز دارید."
  },
  {
    nameEn: "Chery Arrizo 6 Pro",
    acceleration: 6,
    depreciation: 5,
    repairCost: 5,
    secondHandMarket: 5,
    priceDropRate: 5,
    buildQuality: 6,
    afterSalesService: 5,
    ownerSatisfaction: 6,
    purchaseRisk: 5,
    fuelEconomy: 6,
    suitFamily: 5,
    suitCity: 7,
    suitTravel: 6,
    suitYoung: 8,
    suitInvestment: 4,
    frequentPros: [
      "طراحی اسپرت و جذاب",
      "امکانات رفاهی بالا نسبت به قیمت",
      "مصرف سوخت معقول برای موتور توربو",
      "فرمان‌پذیری خوب"
    ],
    frequentCons: [
      "فضای عقب نسبتاً تنگ",
      "صدای موتور در دور بالا",
      "کیفیت رنگ متوسط",
      "افت قیمت در بازار دست‌دوم"
    ],
    commonIssues: [
      "مشکلات CVT در شرایط گرما",
      "خرابی سنسور اکسیژن",
      "لرزش آینه‌های بغل"
    ],
    purchaseWarnings: [
      "بازار فروش سدان چینی ضعیف‌تر از شاسی‌بلند است",
      "رنگ بدنه را دقیق بررسی کنید"
    ],
    ownerVerdict: "سدان اسپرت و خوش‌ظاهری‌ه، برای جوونا عالیه.",
    overallSummary: "آریزو ۶ پرو یک سدان اسپرت چینی با طراحی جذاب و امکانات خوب است که برای جوانان مناسب است اما بازار فروش دست‌دوم ضعیفی دارد.",
    whyBuy: "اگر یک سدان اسپرت و پرامکانات با قیمت مناسب می‌خواهید.",
    whyNotBuy: "اگر نقدشوندگی بالا و فضای خانوادگی بزرگ نیاز دارید."
  },
  {
    nameEn: "Fownix FX",
    acceleration: 5,
    depreciation: 6,
    repairCost: 5,
    secondHandMarket: 4,
    priceDropRate: 7,
    buildQuality: 5,
    afterSalesService: 4,
    ownerSatisfaction: 5,
    purchaseRisk: 7,
    fuelEconomy: 5,
    suitFamily: 6,
    suitCity: 6,
    suitTravel: 5,
    suitYoung: 6,
    suitInvestment: 3,
    frequentPros: [
      "طراحی ظاهری شیک و متفاوت",
      "امکانات فناورانه به‌روز",
      "فضای داخلی مناسب",
      "صفحه‌نمایش بزرگ مرکزی"
    ],
    frequentCons: [
      "خدمات پس از فروش ضعیف سایپا",
      "افت قیمت بسیار شدید",
      "کیفیت مونتاژ نامطلوب",
      "قطعات یدکی محدود و گران"
    ],
    commonIssues: [
      "مشکلات الکترونیکی متعدد",
      "خرابی سیستم تهویه",
      "صدای غیرعادی تعلیق"
    ],
    purchaseWarnings: [
      "سابقه کیفی ضعیف سایپا را در نظر بگیرید",
      "افت قیمت سالانه بسیار بالاست",
      "موجودی قطعات یدکی را بررسی کنید"
    ],
    ownerVerdict: "ظاهر خوبی داره ولی خدمات سایپا همه‌چیز رو خراب می‌کنه.",
    overallSummary: "فونیکس FX ظاهر جذابی دارد اما با توجه به خدمات ضعیف سایپا و افت قیمت شدید، خرید آن ریسک بالایی دارد.",
    whyBuy: "اگر ظاهر و امکانات فناورانه اولویت شماست و ریسک‌پذیر هستید.",
    whyNotBuy: "اگر به خدمات پس از فروش و حفظ ارزش سرمایه اهمیت می‌دهید."
  },
  {
    nameEn: "KMC J7",
    acceleration: 5,
    depreciation: 6,
    repairCost: 5,
    secondHandMarket: 4,
    priceDropRate: 6,
    buildQuality: 5,
    afterSalesService: 4,
    ownerSatisfaction: 5,
    purchaseRisk: 6,
    fuelEconomy: 5,
    suitFamily: 7,
    suitCity: 5,
    suitTravel: 6,
    suitYoung: 4,
    suitInvestment: 3,
    frequentPros: [
      "فضای داخلی خوب و راحت",
      "طراحی ظاهری متفاوت",
      "امکانات رفاهی مناسب",
      "قیمت رقابتی نسبت به رقبا"
    ],
    frequentCons: [
      "برند ناشناخته و بازار فروش ضعیف",
      "خدمات پس از فروش محدود",
      "کیفیت ساخت متوسط",
      "مصرف سوخت بالاتر از ادعای شرکت"
    ],
    commonIssues: [
      "خرابی سیستم برقی",
      "مشکلات گیربکس اتوماتیک",
      "فرسودگی زودرس لنت ترمز"
    ],
    purchaseWarnings: [
      "بازار فروش دست‌دوم بسیار محدود است",
      "تعداد نمایندگی‌ها کم است"
    ],
    ownerVerdict: "ماشین بدی نیست ولی وقت فروش مشکل داری.",
    overallSummary: "KMC J7 شاسی‌بلندی با قیمت مناسب و امکانات خوب است اما برند ناشناخته و بازار فروش ضعیف ریسک خرید آن را بالا می‌برد.",
    whyBuy: "اگر فضای داخلی و امکانات بیشتری با بودجه کمتر می‌خواهید.",
    whyNotBuy: "اگر به نقدشوندگی و ارزش آتی ماشین اهمیت می‌دهید."
  },
  {
    nameEn: "KMC K7",
    acceleration: 6,
    depreciation: 7,
    repairCost: 6,
    secondHandMarket: 4,
    priceDropRate: 7,
    buildQuality: 6,
    afterSalesService: 4,
    ownerSatisfaction: 5,
    purchaseRisk: 7,
    fuelEconomy: 4,
    suitFamily: 8,
    suitCity: 4,
    suitTravel: 7,
    suitYoung: 3,
    suitInvestment: 3,
    frequentPros: [
      "فضای بسیار بزرگ و ۷ نفره",
      "امکانات لوکس و کامل",
      "موتور توربو قدرتمند",
      "طراحی شیک داخلی"
    ],
    frequentCons: [
      "افت قیمت بسیار شدید",
      "مصرف سوخت خیلی بالا",
      "هزینه تعمیر و نگهداری بالا",
      "برند ناشناخته",
      "بازار فروش بسیار ضعیف"
    ],
    commonIssues: [
      "مشکلات گیربکس اتوماتیک در کیلومتر بالا",
      "خرابی سیستم تعلیق عقب",
      "نشتی روغن از واشرها"
    ],
    purchaseWarnings: [
      "افت سرمایه بسیار بالاست",
      "تعمیرکار متخصص پیدا کردن سخت است",
      "هزینه سرویس دوره‌ای بالاست"
    ],
    ownerVerdict: "ماشین لوکس و بزرگی‌ه ولی وقت فروش کابوس میشه.",
    overallSummary: "KMC K7 فضای بزرگ و امکانات لوکسی دارد اما افت قیمت شدید و خدمات محدود، خرید آن را به یک ریسک بزرگ تبدیل می‌کند.",
    whyBuy: "اگر فضای ۷ نفره و امکانات لوکس با قیمت پایین‌تر از رقبا می‌خواهید و قصد فروش ندارید.",
    whyNotBuy: "اگر قصد فروش در آینده دارید یا هزینه نگهداری بالا مشکل‌ساز است."
  },
  {
    nameEn: "BAIC X55",
    acceleration: 5,
    depreciation: 6,
    repairCost: 5,
    secondHandMarket: 4,
    priceDropRate: 7,
    buildQuality: 5,
    afterSalesService: 3,
    ownerSatisfaction: 5,
    purchaseRisk: 7,
    fuelEconomy: 5,
    suitFamily: 6,
    suitCity: 6,
    suitTravel: 5,
    suitYoung: 5,
    suitInvestment: 3,
    frequentPros: [
      "قیمت خرید مناسب",
      "فضای داخلی قابل‌قبول",
      "امکانات رفاهی خوب نسبت به قیمت",
      "طراحی ظاهری ساده و تمیز"
    ],
    frequentCons: [
      "خدمات پس از فروش بسیار ضعیف",
      "افت قیمت شدید",
      "کیفیت مونتاژ ضعیف",
      "قطعات یدکی کمیاب"
    ],
    commonIssues: [
      "مشکلات سیستم برقی و سنسورها",
      "خرابی CVT در ترافیک",
      "خوردگی زیر بدنه"
    ],
    purchaseWarnings: [
      "نمایندگی فعال در شهرتان حتماً داشته باشد",
      "بازار فروش دست‌دوم تقریباً وجود ندارد"
    ],
    ownerVerdict: "قیمتش خوبه ولی وقتی خراب بشه دردسر داری.",
    overallSummary: "بایک X55 کراس‌اووری ارزان با امکانات مناسب است اما خدمات پس از فروش و بازار دست‌دوم بسیار ضعیفی دارد.",
    whyBuy: "اگر بودجه محدودی دارید و فقط به امکانات و فضا اهمیت می‌دهید.",
    whyNotBuy: "اگر دسترسی به خدمات و قطعات و نقدشوندگی برایتان مهم است."
  },
  {
    nameEn: "Dongfeng AX7",
    acceleration: 6,
    depreciation: 6,
    repairCost: 5,
    secondHandMarket: 4,
    priceDropRate: 6,
    buildQuality: 6,
    afterSalesService: 4,
    ownerSatisfaction: 6,
    purchaseRisk: 6,
    fuelEconomy: 5,
    suitFamily: 7,
    suitCity: 5,
    suitTravel: 7,
    suitYoung: 5,
    suitInvestment: 4,
    frequentPros: [
      "فضای داخلی وسیع و راحت",
      "موتور توربو با عملکرد مناسب",
      "امکانات رفاهی کامل",
      "طراحی جدید و جذاب"
    ],
    frequentCons: [
      "برند ناشناخته در ایران",
      "بازار فروش دست‌دوم ضعیف",
      "قطعات یدکی محدود",
      "مصرف سوخت بالاتر از انتظار"
    ],
    commonIssues: [
      "مشکلات نرم‌افزاری سیستم مالتی‌مدیا",
      "صدای سوت توربو",
      "خرابی سنسور TPMS"
    ],
    purchaseWarnings: [
      "موجودی قطعات یدکی در شهرتان را بررسی کنید",
      "برند ناشناخته و فروش دست‌دوم سخت است"
    ],
    ownerVerdict: "ماشین خوبی‌ه ولی کسی نمیشناسه و فروشش سخته.",
    overallSummary: "دانگ‌فنگ AX7 شاسی‌بلند پرامکاناتی با کیفیت مناسب است اما ناشناخته بودن برند در ایران و کمبود قطعات از مشکلات اصلی آن است.",
    whyBuy: "اگر امکانات و فضا اولویت شماست و قصد نگهداری بلندمدت دارید.",
    whyNotBuy: "اگر نقدشوندگی و دسترسی آسان به قطعات برایتان حیاتی است."
  },
  {
    nameEn: "Changan CS35 Plus",
    acceleration: 6,
    depreciation: 5,
    repairCost: 5,
    secondHandMarket: 4,
    priceDropRate: 6,
    buildQuality: 6,
    afterSalesService: 4,
    ownerSatisfaction: 6,
    purchaseRisk: 5,
    fuelEconomy: 6,
    suitFamily: 5,
    suitCity: 7,
    suitTravel: 5,
    suitYoung: 7,
    suitInvestment: 4,
    frequentPros: [
      "طراحی جوان‌پسند و اسپرت",
      "موتور توربو با مصرف معقول",
      "مانور خوب در شهر",
      "امکانات فناورانه مناسب"
    ],
    frequentCons: [
      "فضای عقب تنگ",
      "صندوق عقب کوچک",
      "افت قیمت در بازار",
      "خدمات پس از فروش محدود"
    ],
    commonIssues: [
      "مشکلات گیربکس DCT در ترافیک سنگین",
      "خرابی دوربین عقب",
      "صدای تعلیق جلو"
    ],
    purchaseWarnings: [
      "فضای کوچک برای خانواده مناسب نیست",
      "نمایندگی فعال داشته باشد"
    ],
    ownerVerdict: "ماشین شهری خوب و خوش‌ظاهری‌ه، برای تک‌نفره عالیه.",
    overallSummary: "چانگان CS35 یک کراس‌اوور کامپکت شهری با طراحی جذاب و مصرف معقول است که برای جوانان و استفاده شهری مناسب است.",
    whyBuy: "اگر یک کراس‌اوور شهری کامپکت و جوان‌پسند می‌خواهید.",
    whyNotBuy: "اگر فضای خانوادگی بزرگ و بازار فروش قوی نیاز دارید."
  },
  {
    nameEn: "Changan CS55 Plus",
    acceleration: 6,
    depreciation: 6,
    repairCost: 5,
    secondHandMarket: 4,
    priceDropRate: 6,
    buildQuality: 6,
    afterSalesService: 4,
    ownerSatisfaction: 6,
    purchaseRisk: 6,
    fuelEconomy: 5,
    suitFamily: 7,
    suitCity: 5,
    suitTravel: 7,
    suitYoung: 5,
    suitInvestment: 4,
    frequentPros: [
      "کیفیت ساخت خوب برای چینی",
      "موتور توربو قدرتمند",
      "امکانات ایمنی و رفاهی کامل",
      "فضای داخلی مناسب"
    ],
    frequentCons: [
      "مصرف سوخت نسبتاً بالا",
      "برند ناشناخته و فروش سخت",
      "قطعات یدکی محدود",
      "صداگیری متوسط"
    ],
    commonIssues: [
      "مشکلات گیربکس DCT",
      "خرابی سنسور نقطه کور",
      "نشتی آب از سقف پانوراما"
    ],
    purchaseWarnings: [
      "گیربکس DCT در ترافیک مشکل‌ساز می‌شود",
      "بازار فروش محدود است"
    ],
    ownerVerdict: "ماشین خوبی‌ه ولی بازارش هنوز جا نیفتاده.",
    overallSummary: "چانگان CS55 پلاس شاسی‌بلند خوش‌ساختی با امکانات کامل است اما ناشناخته بودن برند و محدودیت قطعات از چالش‌های اصلی آن است.",
    whyBuy: "اگر کیفیت ساخت و امکانات بالا با قیمت معقول می‌خواهید و قصد نگهداری بلندمدت دارید.",
    whyNotBuy: "اگر نقدشوندگی بالا و خدمات گسترده برایتان ضروری است."
  },
  {
    nameEn: "Haval H6",
    acceleration: 7,
    depreciation: 5,
    repairCost: 5,
    secondHandMarket: 5,
    priceDropRate: 5,
    buildQuality: 7,
    afterSalesService: 5,
    ownerSatisfaction: 7,
    purchaseRisk: 5,
    fuelEconomy: 5,
    suitFamily: 8,
    suitCity: 5,
    suitTravel: 8,
    suitYoung: 5,
    suitInvestment: 5,
    frequentPros: [
      "کیفیت ساخت بسیار بالا برای چینی",
      "امکانات لوکس و کامل",
      "عملکرد موتور عالی",
      "فضای داخلی بزرگ و راحت",
      "سیستم ایمنی پیشرفته"
    ],
    frequentCons: [
      "قیمت بالا نزدیک به کره‌ای‌ها",
      "مصرف سوخت بالا",
      "هزینه سرویس و قطعات گران",
      "افت قیمت در بازار"
    ],
    commonIssues: [
      "مشکلات گیربکس DCT در ترافیک",
      "خرابی سنسورهای ADAS",
      "صدای فن رادیاتور"
    ],
    purchaseWarnings: [
      "قیمتش نزدیک به کره‌ای‌هاست، مقایسه کنید",
      "گیربکس DCT را حتماً در ترافیک تست کنید"
    ],
    ownerVerdict: "نزدیک‌ترین چینی به کیفیت کره‌ای، واقعاً خوبه.",
    overallSummary: "هاوال H6 با بالاترین کیفیت ساخت در بین چینی‌ها، نزدیک‌ترین رقیب خودروهای کره‌ای است اما قیمت و هزینه نگهداری بالایی دارد.",
    whyBuy: "اگر بهترین کیفیت ممکن در بین چینی‌ها را می‌خواهید.",
    whyNotBuy: "اگر با کمی بودجه بیشتر می‌توانید کره‌ای بخرید، شاید ارزشش را داشته باشد."
  },
  {
    nameEn: "Haval Jolion",
    acceleration: 6,
    depreciation: 5,
    repairCost: 5,
    secondHandMarket: 5,
    priceDropRate: 5,
    buildQuality: 7,
    afterSalesService: 5,
    ownerSatisfaction: 6,
    purchaseRisk: 5,
    fuelEconomy: 6,
    suitFamily: 6,
    suitCity: 7,
    suitTravel: 6,
    suitYoung: 7,
    suitInvestment: 4,
    frequentPros: [
      "طراحی جوان‌پسند و شیک",
      "کیفیت ساخت بالا",
      "امکانات فناورانه پیشرفته",
      "مصرف سوخت معقول",
      "رانندگی لذت‌بخش"
    ],
    frequentCons: [
      "فضای عقب نسبتاً کوچک",
      "صندوق عقب محدود",
      "قطعات یدکی گران",
      "بازار فروش دست‌دوم متوسط"
    ],
    commonIssues: [
      "مشکلات نرم‌افزاری صفحه‌نمایش",
      "صدای ترمز عقب",
      "خرابی سنسور باران"
    ],
    purchaseWarnings: [
      "فضای محدود برای خانواده بزرگ مناسب نیست",
      "قیمت قطعات را قبل از خرید بررسی کنید"
    ],
    ownerVerdict: "کراس‌اوور شیک و باکیفیتی‌ه، برای زوج‌های جوان عالیه.",
    overallSummary: "هاوال جولیان کراس‌اوور شیک و باکیفیتی با امکانات فناورانه پیشرفته است که برای جوانان و زوج‌ها مناسب‌تر از خانواده‌های بزرگ است.",
    whyBuy: "اگر یک کراس‌اوور شیک و باکیفیت چینی برای استفاده شهری و سفرهای کوتاه می‌خواهید.",
    whyNotBuy: "اگر فضای خانوادگی بزرگ یا بازار فروش قوی نیاز دارید."
  },
  {
    nameEn: "GAC GS3",
    acceleration: 5,
    depreciation: 6,
    repairCost: 5,
    secondHandMarket: 4,
    priceDropRate: 6,
    buildQuality: 5,
    afterSalesService: 4,
    ownerSatisfaction: 5,
    purchaseRisk: 6,
    fuelEconomy: 6,
    suitFamily: 5,
    suitCity: 7,
    suitTravel: 5,
    suitYoung: 6,
    suitInvestment: 3,
    frequentPros: [
      "قیمت مناسب و رقابتی",
      "مصرف سوخت قابل‌قبول",
      "امکانات خوب نسبت به قیمت",
      "مانور خوب در شهر"
    ],
    frequentCons: [
      "برند ناشناخته در ایران",
      "بازار فروش دست‌دوم بسیار ضعیف",
      "کیفیت مونتاژ متوسط",
      "خدمات پس از فروش محدود"
    ],
    commonIssues: [
      "مشکلات سیستم برقی",
      "خرابی کمپرسور کولر",
      "صدای غیرعادی از تعلیق"
    ],
    purchaseWarnings: [
      "فروش دست‌دوم بسیار سخت خواهد بود",
      "نمایندگی و قطعات بسیار محدود است"
    ],
    ownerVerdict: "قیمتش خوبه ولی برند رو کسی نمی‌شناسه.",
    overallSummary: "جک GS3 کراس‌اوور ارزانی با امکانات قابل‌قبول است اما ناشناخته بودن برند و محدودیت شدید خدمات و قطعات، خرید آن را پرریسک می‌کند.",
    whyBuy: "اگر فقط قیمت برایتان مهم است و قصد نگهداری بلندمدت دارید.",
    whyNotBuy: "اگر نقدشوندگی، خدمات و آرامش خاطر بعد از خرید برایتان مهم است."
  },
  {
    nameEn: "Lifan X70",
    acceleration: 4,
    depreciation: 7,
    repairCost: 5,
    secondHandMarket: 3,
    priceDropRate: 8,
    buildQuality: 4,
    afterSalesService: 3,
    ownerSatisfaction: 4,
    purchaseRisk: 8,
    fuelEconomy: 5,
    suitFamily: 5,
    suitCity: 5,
    suitTravel: 5,
    suitYoung: 3,
    suitInvestment: 2,
    frequentPros: [
      "قیمت خرید پایین",
      "فضای داخلی نسبتاً بزرگ",
      "ظاهر قابل‌قبول برای قیمتش"
    ],
    frequentCons: [
      "کیفیت ساخت بسیار ضعیف",
      "افت قیمت فاجعه‌بار",
      "خدمات پس از فروش تقریباً وجود ندارد",
      "قطعات یدکی بسیار کمیاب",
      "مشکلات فنی متعدد"
    ],
    commonIssues: [
      "خرابی CVT پیش از ۵۰ هزار کیلومتر",
      "روغن‌ریزی موتور",
      "خوردگی شدید بدنه",
      "مشکلات سیستم خنک‌کننده"
    ],
    purchaseWarnings: [
      "ریسک بسیار بالایی دارد",
      "شرکت لیفان در چین ورشکست شده",
      "قطعات یدکی ممکن است اصلاً پیدا نشود"
    ],
    ownerVerdict: "از خریدش پشیمانم، فقط سردرد و هزینه بود.",
    overallSummary: "لیفان X70 با توجه به ورشکستگی شرکت مادر و کمبود شدید قطعات، یکی از پرریسک‌ترین خریدهای بازار است و توصیه نمی‌شود.",
    whyBuy: "صادقانه، دلیل قانع‌کننده‌ای برای خرید این ماشین وجود ندارد.",
    whyNotBuy: "شرکت سازنده ورشکست شده، قطعات نایاب است و افت قیمت فاجعه‌بار دارد."
  },

  // ─── Korean Cars ─────────────────────────────────
  {
    nameEn: "Hyundai Tucson",
    acceleration: 7,
    depreciation: 3,
    repairCost: 6,
    secondHandMarket: 9,
    priceDropRate: 2,
    buildQuality: 8,
    afterSalesService: 7,
    ownerSatisfaction: 8,
    purchaseRisk: 3,
    fuelEconomy: 6,
    suitFamily: 8,
    suitCity: 6,
    suitTravel: 8,
    suitYoung: 6,
    suitInvestment: 8,
    frequentPros: [
      "کیفیت ساخت بالا و دوام عالی",
      "بازار فروش بسیار قوی و نقدشوندگی بالا",
      "طراحی مدرن و جذاب",
      "سیستم ایمنی پیشرفته",
      "حفظ ارزش عالی"
    ],
    frequentCons: [
      "قیمت خرید بسیار بالا در ایران",
      "قطعات اصلی گران و کمیاب",
      "هزینه تعمیر بالا",
      "مصرف سوخت متوسط"
    ],
    commonIssues: [
      "مشکلات سیستم هیبریدی در مدل‌های جدید",
      "خرابی کمپرسور کولر",
      "ساییدگی زودرس لنت ترمز"
    ],
    purchaseWarnings: [
      "فقط از نمایندگی‌های معتبر بخرید",
      "قیمت قطعات اصلی را قبل از خرید بررسی کنید"
    ],
    ownerVerdict: "ماشین فوق‌العاده‌ای‌ه، گرونه ولی ارزشش رو داره.",
    overallSummary: "توسان یکی از محبوب‌ترین و مطمئن‌ترین شاسی‌بلندهای بازار ایران با حفظ ارزش عالی است، هرچند قیمت خرید و نگهداری بسیار بالایی دارد.",
    whyBuy: "اگر بودجه کافی دارید و یک شاسی‌بلند مطمئن با حفظ ارزش عالی می‌خواهید.",
    whyNotBuy: "اگر بودجه محدودی دارید، قیمت خرید و نگهداری بسیار بالاست."
  },
  {
    nameEn: "Hyundai Santa Fe",
    acceleration: 8,
    depreciation: 3,
    repairCost: 7,
    secondHandMarket: 9,
    priceDropRate: 2,
    buildQuality: 9,
    afterSalesService: 7,
    ownerSatisfaction: 9,
    purchaseRisk: 3,
    fuelEconomy: 5,
    suitFamily: 9,
    suitCity: 5,
    suitTravel: 9,
    suitYoung: 4,
    suitInvestment: 8,
    frequentPros: [
      "کیفیت ساخت درجه یک",
      "فضای داخلی بسیار بزرگ و لوکس",
      "حفظ ارزش فوق‌العاده در بازار",
      "عملکرد موتور قوی و روان",
      "ایمنی بالا"
    ],
    frequentCons: [
      "قیمت خرید بسیار بالا",
      "هزینه تعمیر و قطعات خیلی گران",
      "مصرف سوخت بالا",
      "ابعاد بزرگ و مانور سخت"
    ],
    commonIssues: [
      "خرابی سیستم تعلیق بادی (در مدل‌های مجهز)",
      "مشکلات سنسورهای پارک",
      "ساییدگی دیسک ترمز"
    ],
    purchaseWarnings: [
      "هزینه تعمیرات یک سطح بالاتر از توسان است",
      "اصالت خودرو و گمرکی بودن را بررسی کنید"
    ],
    ownerVerdict: "بهترین شاسی‌بلند بازار ایرانه، لذت رانندگی واقعی رو باهاش تجربه می‌کنی.",
    overallSummary: "سانتافه پرچم‌دار شاسی‌بلندهای کره‌ای در ایران با بالاترین کیفیت، فضا و حفظ ارزش است اما قیمت ورود و نگهداری بسیار بالایی دارد.",
    whyBuy: "اگر بودجه بالایی دارید و بهترین شاسی‌بلند بازار را می‌خواهید.",
    whyNotBuy: "اگر بودجه‌تان محدود است، هزینه‌های این ماشین سنگین خواهد بود."
  },
  {
    nameEn: "Hyundai Sonata",
    acceleration: 7,
    depreciation: 3,
    repairCost: 6,
    secondHandMarket: 8,
    priceDropRate: 3,
    buildQuality: 8,
    afterSalesService: 7,
    ownerSatisfaction: 8,
    purchaseRisk: 3,
    fuelEconomy: 6,
    suitFamily: 7,
    suitCity: 7,
    suitTravel: 7,
    suitYoung: 6,
    suitInvestment: 7,
    frequentPros: [
      "طراحی بسیار زیبا و لوکس",
      "کیفیت ساخت بالا",
      "حفظ ارزش خوب",
      "فضای داخلی بزرگ و راحت",
      "رانندگی نرم و آرام"
    ],
    frequentCons: [
      "قیمت خرید بسیار بالا",
      "قطعات اصلی گران",
      "تعمیرکار متخصص محدود",
      "مصرف سوخت متوسط"
    ],
    commonIssues: [
      "خرابی کمپرسور کولر در گرما",
      "مشکلات سیستم اینفوتینمنت",
      "ساییدگی زودرس لنت عقب"
    ],
    purchaseWarnings: [
      "فقط از فروشنده معتبر و با مدارک کامل بخرید",
      "سابقه تصادف و رنگ‌شدگی را دقیق بررسی کنید"
    ],
    ownerVerdict: "سدان لوکس و باکلاسی‌ه، هرکسی سوارش بشه عاشقش میشه.",
    overallSummary: "سوناتا سدان لوکس و باکیفیت هیوندای با طراحی چشم‌نواز و حفظ ارزش خوب است که برای کسانی با بودجه بالا گزینه عالی است.",
    whyBuy: "اگر یک سدان لوکس و باکلاس با حفظ ارزش خوب می‌خواهید.",
    whyNotBuy: "اگر بودجه محدودی دارید یا هزینه نگهداری بالا مشکل‌ساز است."
  },
  {
    nameEn: "Hyundai Elantra",
    acceleration: 6,
    depreciation: 3,
    repairCost: 5,
    secondHandMarket: 8,
    priceDropRate: 3,
    buildQuality: 8,
    afterSalesService: 7,
    ownerSatisfaction: 7,
    purchaseRisk: 3,
    fuelEconomy: 7,
    suitFamily: 6,
    suitCity: 8,
    suitTravel: 6,
    suitYoung: 8,
    suitInvestment: 7,
    frequentPros: [
      "طراحی فوق‌العاده مدرن و اسپرت",
      "مصرف سوخت اقتصادی",
      "کیفیت ساخت بالا",
      "حفظ ارزش خوب",
      "رانندگی لذت‌بخش"
    ],
    frequentCons: [
      "قیمت بالا برای یک سدان",
      "فضای عقب نسبتاً کوچک",
      "دید عقب محدود به دلیل طراحی",
      "قطعات اصلی گران"
    ],
    commonIssues: [
      "صدای تعلیق روی دست‌انداز",
      "خرابی سنسور نقطه کور",
      "مشکلات پمپ بنزین"
    ],
    purchaseWarnings: [
      "دید عقب را حتماً تست کنید",
      "قیمت بیمه بدنه بالاست"
    ],
    ownerVerdict: "سدان شیک و باکیفیت، طراحیش خیلی خاصه و چشمگیره.",
    overallSummary: "النترا سدان مدرن و اسپرت هیوندای با مصرف سوخت خوب و کیفیت بالاست که برای جوانان و استفاده شهری عالی است.",
    whyBuy: "اگر یک سدان مدرن و اسپرت کره‌ای با مصرف سوخت خوب می‌خواهید.",
    whyNotBuy: "اگر فضای داخلی بزرگ و دید عقب خوب برایتان مهم است."
  },
  {
    nameEn: "KIA Sportage",
    acceleration: 7,
    depreciation: 3,
    repairCost: 6,
    secondHandMarket: 9,
    priceDropRate: 2,
    buildQuality: 8,
    afterSalesService: 7,
    ownerSatisfaction: 8,
    purchaseRisk: 3,
    fuelEconomy: 6,
    suitFamily: 8,
    suitCity: 6,
    suitTravel: 8,
    suitYoung: 6,
    suitInvestment: 8,
    frequentPros: [
      "طراحی بسیار مدرن و جذاب",
      "نقدشوندگی فوق‌العاده بالا",
      "کیفیت ساخت عالی",
      "سیستم ایمنی پیشرفته",
      "حفظ ارزش استثنایی"
    ],
    frequentCons: [
      "قیمت خرید بسیار بالا",
      "هزینه تعمیر و قطعات گران",
      "مصرف سوخت متوسط",
      "صف انتظار طولانی"
    ],
    commonIssues: [
      "مشکلات سیستم توربو در مدل‌های جدید",
      "خرابی کمپرسور کولر",
      "صدای فن رادیاتور"
    ],
    purchaseWarnings: [
      "مراقب قیمت‌های نجومی بازار آزاد باشید",
      "اصالت و سلامت فنی را دقیق بررسی کنید"
    ],
    ownerVerdict: "اسپورتیج طلای بازار ماشین ایرانه، هم لذت رانندگی داره هم سودش خوبه.",
    overallSummary: "اسپورتیج یکی از بهترین و محبوب‌ترین شاسی‌بلندهای بازار ایران با حفظ ارزش استثنایی و کیفیت بالاست.",
    whyBuy: "اگر بودجه دارید، بهترین ترکیب کیفیت، حفظ ارزش و لذت رانندگی را ارائه می‌دهد.",
    whyNotBuy: "اگر بودجه محدودی دارید، قیمت ورود بسیار بالاست."
  },
  {
    nameEn: "KIA Cerato",
    acceleration: 6,
    depreciation: 3,
    repairCost: 5,
    secondHandMarket: 8,
    priceDropRate: 3,
    buildQuality: 7,
    afterSalesService: 7,
    ownerSatisfaction: 7,
    purchaseRisk: 3,
    fuelEconomy: 7,
    suitFamily: 6,
    suitCity: 8,
    suitTravel: 6,
    suitYoung: 7,
    suitInvestment: 7,
    frequentPros: [
      "مصرف سوخت اقتصادی",
      "کیفیت ساخت بالا",
      "حفظ ارزش خوب",
      "نقدشوندگی بالا",
      "هزینه نگهداری معقول نسبت به سایر کره‌ای‌ها"
    ],
    frequentCons: [
      "قیمت خرید بالا",
      "طراحی داخلی ساده نسبت به رقبا",
      "فضای صندوق متوسط",
      "قطعات اصلی گران"
    ],
    commonIssues: [
      "خرابی بلبرینگ چرخ",
      "مشکلات سیستم ایموبلایزر",
      "ساییدگی کلاچ در مدل دستی"
    ],
    purchaseWarnings: [
      "بین مدل‌های مختلف تفاوت زیادی وجود دارد",
      "نسل جدید قطعاتش گران‌تر است"
    ],
    ownerVerdict: "ماشین مطمئن و بی‌دردسری‌ه، خیال‌آسوده باهاش رانندگی کن.",
    overallSummary: "سراتو سدان مطمئن و اقتصادی کیا با حفظ ارزش خوب و مصرف سوخت پایین است که برای استفاده روزمره عالی است.",
    whyBuy: "اگر یک سدان کره‌ای مطمئن و اقتصادی با حفظ ارزش خوب می‌خواهید.",
    whyNotBuy: "اگر طراحی لوکس و امکانات پیشرفته اولویت شماست."
  },
  {
    nameEn: "KIA Sorento",
    acceleration: 8,
    depreciation: 3,
    repairCost: 7,
    secondHandMarket: 8,
    priceDropRate: 2,
    buildQuality: 9,
    afterSalesService: 7,
    ownerSatisfaction: 8,
    purchaseRisk: 3,
    fuelEconomy: 4,
    suitFamily: 9,
    suitCity: 4,
    suitTravel: 9,
    suitYoung: 3,
    suitInvestment: 7,
    frequentPros: [
      "فضای بسیار بزرگ و ۷ نفره واقعی",
      "کیفیت ساخت فوق‌العاده",
      "موتور قوی و روان",
      "حفظ ارزش عالی",
      "ایمنی در سطح بالا"
    ],
    frequentCons: [
      "قیمت بسیار بالا",
      "مصرف سوخت خیلی بالا",
      "هزینه تعمیر و قطعات سنگین",
      "ابعاد بزرگ و پارک سخت"
    ],
    commonIssues: [
      "مشکلات گیربکس اتوماتیک در کیلومتر بالا",
      "خرابی پمپ هیدرولیک فرمان",
      "نشتی واشر سرسیلندر"
    ],
    purchaseWarnings: [
      "هزینه نگهداری یک سطح بالاتر از اسپورتیج است",
      "مصرف سوخت واقعی را در نظر بگیرید"
    ],
    ownerVerdict: "شاسی‌بلند لوکس و خانوادگی واقعی، ولی جیبت باید بزرگ باشه.",
    overallSummary: "سورنتو شاسی‌بلند لوکس و ۷ نفره کیا با بالاترین کیفیت است اما قیمت و هزینه نگهداری آن بسیار بالاست.",
    whyBuy: "اگر بودجه بالایی دارید و یک ۷ نفره لوکس و مطمئن نیاز دارید.",
    whyNotBuy: "اگر بودجه محدودی دارید یا ماشین کوچک‌تر و اقتصادی‌تر نیاز دارید."
  },
  {
    nameEn: "Hyundai Accent",
    acceleration: 5,
    depreciation: 3,
    repairCost: 5,
    secondHandMarket: 8,
    priceDropRate: 3,
    buildQuality: 7,
    afterSalesService: 7,
    ownerSatisfaction: 7,
    purchaseRisk: 3,
    fuelEconomy: 8,
    suitFamily: 5,
    suitCity: 8,
    suitTravel: 5,
    suitYoung: 7,
    suitInvestment: 7,
    frequentPros: [
      "مصرف سوخت بسیار اقتصادی",
      "کیفیت ساخت بالا",
      "حفظ ارزش خوب",
      "نقدشوندگی بالا",
      "هزینه نگهداری معقول"
    ],
    frequentCons: [
      "فضای داخلی کوچک",
      "قدرت موتور محدود",
      "امکانات رفاهی محدود نسبت به رقبا",
      "صداگیری متوسط"
    ],
    commonIssues: [
      "خرابی بوبین و شمع",
      "مشکلات سیستم ترمز ABS",
      "ساییدگی زودرس کلاچ"
    ],
    purchaseWarnings: [
      "موتور ضعیف است، در اتوبان تست کنید",
      "قطعات متفرقه فراوان، قطعات اصلی بخرید"
    ],
    ownerVerdict: "ماشین ساده و بی‌دردسر، مصرفش عالیه.",
    overallSummary: "اکسنت سدان اقتصادی و بی‌دردسر هیوندای با مصرف سوخت عالی و حفظ ارزش خوب است که برای تردد شهری ایده‌آل است.",
    whyBuy: "اگر یک سدان کره‌ای اقتصادی و بی‌دردسر با مصرف سوخت پایین می‌خواهید.",
    whyNotBuy: "اگر قدرت موتور بالا و فضای بزرگ نیاز دارید."
  },

  // ─── Japanese Cars ─────────────────────────────────
  {
    nameEn: "Toyota RAV4",
    acceleration: 7,
    depreciation: 2,
    repairCost: 7,
    secondHandMarket: 10,
    priceDropRate: 1,
    buildQuality: 9,
    afterSalesService: 6,
    ownerSatisfaction: 9,
    purchaseRisk: 2,
    fuelEconomy: 6,
    suitFamily: 8,
    suitCity: 6,
    suitTravel: 9,
    suitYoung: 5,
    suitInvestment: 9,
    frequentPros: [
      "قابلیت اطمینان افسانه‌ای تویوتا",
      "حفظ ارزش بی‌نظیر در بازار ایران",
      "کیفیت ساخت فوق‌العاده",
      "دوام مکانیکی بالا",
      "عملکرد عالی در جاده‌های مختلف"
    ],
    frequentCons: [
      "قیمت خرید بسیار بالا",
      "قطعات اصلی بسیار گران و کمیاب",
      "نمایندگی رسمی وجود ندارد",
      "امکانات فناورانه کمتر از رقبای کره‌ای"
    ],
    commonIssues: [
      "ساییدگی لنت و دیسک ترمز",
      "مشکلات کمپرسور کولر در گرمای شدید",
      "خرابی سنسور اکسیژن"
    ],
    purchaseWarnings: [
      "تعمیرکار متخصص تویوتا پیدا کنید",
      "فقط قطعات اصلی استفاده کنید"
    ],
    ownerVerdict: "بهترین ماشینی‌ه که تو عمرم داشتم، هیچ‌وقت سر کار نمیذاره.",
    overallSummary: "RAV4 با قابلیت اطمینان افسانه‌ای تویوتا و حفظ ارزش بی‌نظیر، بهترین سرمایه‌گذاری در بازار خودروی ایران است هرچند قیمت ورود بسیار بالایی دارد.",
    whyBuy: "اگر بودجه بالایی دارید و یک سرمایه‌گذاری مطمئن با بالاترین دوام را می‌خواهید.",
    whyNotBuy: "اگر بودجه محدودی دارید یا به نمایندگی رسمی و خدمات آسان نیاز دارید."
  },
  {
    nameEn: "Toyota Corolla",
    acceleration: 5,
    depreciation: 2,
    repairCost: 6,
    secondHandMarket: 9,
    priceDropRate: 2,
    buildQuality: 9,
    afterSalesService: 6,
    ownerSatisfaction: 8,
    purchaseRisk: 2,
    fuelEconomy: 8,
    suitFamily: 6,
    suitCity: 8,
    suitTravel: 6,
    suitYoung: 6,
    suitInvestment: 8,
    frequentPros: [
      "قابلیت اطمینان و دوام بی‌نظیر",
      "مصرف سوخت بسیار اقتصادی",
      "حفظ ارزش عالی",
      "نقدشوندگی فوق‌العاده",
      "هزینه نگهداری مکانیکی پایین"
    ],
    frequentCons: [
      "قیمت خرید بالا",
      "طراحی محافظه‌کارانه",
      "امکانات رفاهی کمتر از رقبای کره‌ای",
      "قطعات اصلی گران"
    ],
    commonIssues: [
      "ساییدگی لنت ترمز",
      "خرابی واترپمپ در کیلومتر بالا",
      "مشکل پمپ بنزین"
    ],
    purchaseWarnings: [
      "فقط قطعات اصلی استفاده کنید",
      "مطمئن شوید گمرکی است نه اروندی"
    ],
    ownerVerdict: "ماشین بی‌دردسر واقعی، مثل ساعت کار می‌کنه.",
    overallSummary: "کرولا پرفروش‌ترین سدان تاریخ با قابلیت اطمینان افسانه‌ای و مصرف سوخت عالی است که حفظ ارزش بی‌نظیری در بازار ایران دارد.",
    whyBuy: "اگر یک سدان بی‌دردسر با بالاترین دوام و حفظ ارزش می‌خواهید.",
    whyNotBuy: "اگر امکانات لوکس و طراحی جذاب اولویت شماست."
  },
  {
    nameEn: "Toyota C-HR",
    acceleration: 6,
    depreciation: 3,
    repairCost: 7,
    secondHandMarket: 8,
    priceDropRate: 3,
    buildQuality: 8,
    afterSalesService: 5,
    ownerSatisfaction: 7,
    purchaseRisk: 3,
    fuelEconomy: 7,
    suitFamily: 5,
    suitCity: 8,
    suitTravel: 6,
    suitYoung: 9,
    suitInvestment: 7,
    frequentPros: [
      "طراحی بسیار خاص و متفاوت",
      "کیفیت ساخت تویوتا",
      "مصرف سوخت عالی (مدل هیبرید)",
      "رانندگی لذت‌بخش و اسپرت"
    ],
    frequentCons: [
      "فضای عقب بسیار تنگ",
      "دید عقب بسیار محدود",
      "قطعات بسیار گران",
      "صندوق عقب کوچک"
    ],
    commonIssues: [
      "مشکلات سیستم هیبریدی",
      "خرابی سنسور پارک",
      "صدای تعلیق روی دست‌انداز"
    ],
    purchaseWarnings: [
      "فضای عقب را قبل از خرید ببینید",
      "هزینه تعمیر سیستم هیبریدی بالاست"
    ],
    ownerVerdict: "ماشین خاص و سر‌زبونیه، ولی عملاً فقط برای ۲ نفر مناسبه.",
    overallSummary: "C-HR کراس‌اوور خاص و اسپرت تویوتا با طراحی چشمگیر است اما فضای محدود عقب و قطعات گران از نقاط ضعف اصلی آن هستند.",
    whyBuy: "اگر طراحی خاص و متفاوت می‌خواهید و عمدتاً تنها یا دونفره سفر می‌کنید.",
    whyNotBuy: "اگر خانواده دارید یا فضای داخلی بزرگ نیاز دارید."
  },
  {
    nameEn: "Mitsubishi Outlander",
    acceleration: 6,
    depreciation: 3,
    repairCost: 6,
    secondHandMarket: 7,
    priceDropRate: 3,
    buildQuality: 7,
    afterSalesService: 5,
    ownerSatisfaction: 7,
    purchaseRisk: 4,
    fuelEconomy: 5,
    suitFamily: 8,
    suitCity: 5,
    suitTravel: 8,
    suitYoung: 4,
    suitInvestment: 6,
    frequentPros: [
      "فضای داخلی بزرگ و ۷ نفره",
      "دوام و قابلیت اطمینان ژاپنی",
      "عملکرد خوب در آفرود سبک",
      "سیستم چهارچرخ‌محرک کارآمد"
    ],
    frequentCons: [
      "طراحی داخلی ساده و قدیمی",
      "مصرف سوخت بالا",
      "قطعات گران",
      "امکانات فناورانه کمتر از رقبا"
    ],
    commonIssues: [
      "مشکلات CVT در کیلومتر بالا",
      "خرابی سیستم چهارچرخ‌محرک",
      "نشتی روغن از سیل‌ها"
    ],
    purchaseWarnings: [
      "گیربکس CVT را دقیق بررسی کنید",
      "سیستم ۴WD را تست کنید"
    ],
    ownerVerdict: "ماشین قابل‌اعتماد و مناسب جاده‌های ایران، ولی آپشن‌هاش کمه.",
    overallSummary: "اوتلندر شاسی‌بلند خانوادگی و قابل‌اعتماد میتسوبیشی با فضای ۷ نفره و عملکرد خوب در جاده‌های ایران است اما از نظر امکانات عقب‌تر از رقبای کره‌ای است.",
    whyBuy: "اگر یک شاسی‌بلند ۷ نفره ژاپنی قابل‌اعتماد با توانایی آفرود سبک می‌خواهید.",
    whyNotBuy: "اگر امکانات مدرن و طراحی لوکس داخلی برایتان مهم است."
  },
  {
    nameEn: "Mitsubishi ASX",
    acceleration: 5,
    depreciation: 3,
    repairCost: 6,
    secondHandMarket: 7,
    priceDropRate: 3,
    buildQuality: 7,
    afterSalesService: 5,
    ownerSatisfaction: 7,
    purchaseRisk: 4,
    fuelEconomy: 6,
    suitFamily: 6,
    suitCity: 7,
    suitTravel: 6,
    suitYoung: 6,
    suitInvestment: 6,
    frequentPros: [
      "دوام و قابلیت اطمینان ژاپنی",
      "ابعاد مناسب برای شهر",
      "حفظ ارزش خوب",
      "مصرف سوخت معقول"
    ],
    frequentCons: [
      "طراحی قدیمی داخلی",
      "قدرت موتور محدود",
      "امکانات رفاهی کم نسبت به رقبا",
      "قطعات گران"
    ],
    commonIssues: [
      "خرابی CVT بعد از ۱۰۰ هزار کیلومتر",
      "مشکلات سیستم ترمز",
      "ساییدگی زودرس کمک‌فنر"
    ],
    purchaseWarnings: [
      "موتور ضعیف است، برای اتوبان تست کنید",
      "CVT را در ترافیک و سربالایی بررسی کنید"
    ],
    ownerVerdict: "کراس‌اوور ساده و بی‌دردسر ژاپنی، برای شهر خوبه.",
    overallSummary: "ASX کراس‌اوور کامپکت و قابل‌اعتماد میتسوبیشی با حفظ ارزش خوب است اما از نظر امکانات و قدرت موتور نسبت به رقبا عقب‌تر است.",
    whyBuy: "اگر یک کراس‌اوور کامپکت ژاپنی بی‌دردسر با حفظ ارزش خوب می‌خواهید.",
    whyNotBuy: "اگر قدرت موتور بالا و امکانات مدرن برایتان مهم است."
  },
  {
    nameEn: "Mazda 3",
    acceleration: 7,
    depreciation: 3,
    repairCost: 6,
    secondHandMarket: 8,
    priceDropRate: 3,
    buildQuality: 8,
    afterSalesService: 5,
    ownerSatisfaction: 8,
    purchaseRisk: 3,
    fuelEconomy: 7,
    suitFamily: 5,
    suitCity: 8,
    suitTravel: 6,
    suitYoung: 9,
    suitInvestment: 7,
    frequentPros: [
      "رانندگی فوق‌العاده لذت‌بخش و اسپرت",
      "طراحی داخلی و خارجی بی‌نظیر",
      "کیفیت ساخت عالی",
      "فرمان‌پذیری استثنایی",
      "مصرف سوخت معقول"
    ],
    frequentCons: [
      "فضای عقب کوچک",
      "صندوق عقب محدود",
      "قطعات گران و کمیاب",
      "نمایندگی رسمی محدود"
    ],
    commonIssues: [
      "مشکلات سیستم i-Stop",
      "خرابی سنسور TPMS",
      "صدای تعلیق عقب"
    ],
    purchaseWarnings: [
      "قطعات خاص مزدا کمیاب و گران است",
      "تعمیرکار متخصص مزدا پیدا کنید"
    ],
    ownerVerdict: "هر بار سوارش میشم لذت می‌برم، ماشین راننده‌پسند واقعی‌ه.",
    overallSummary: "مزدا ۳ یکی از لذت‌بخش‌ترین سدان‌ها برای رانندگی با طراحی زیبا و کیفیت بالاست اما فضای محدود و قطعات کمیاب از چالش‌های آن است.",
    whyBuy: "اگر لذت رانندگی و طراحی زیبا اولویت شماست.",
    whyNotBuy: "اگر فضای خانوادگی بزرگ یا دسترسی آسان به قطعات نیاز دارید."
  },
  {
    nameEn: "Mazda CX-5",
    acceleration: 7,
    depreciation: 3,
    repairCost: 7,
    secondHandMarket: 8,
    priceDropRate: 2,
    buildQuality: 8,
    afterSalesService: 5,
    ownerSatisfaction: 8,
    purchaseRisk: 3,
    fuelEconomy: 6,
    suitFamily: 7,
    suitCity: 6,
    suitTravel: 8,
    suitYoung: 7,
    suitInvestment: 7,
    frequentPros: [
      "رانندگی لذت‌بخش و فرمان‌پذیری عالی",
      "طراحی داخلی و خارجی لوکس",
      "کیفیت ساخت ژاپنی بالا",
      "حفظ ارزش خوب",
      "ترکیب عالی فضا و اسپرت بودن"
    ],
    frequentCons: [
      "قطعات گران و کمیاب در ایران",
      "نمایندگی رسمی محدود",
      "مصرف سوخت متوسط",
      "هزینه تعمیر بالا"
    ],
    commonIssues: [
      "مشکلات سیستم AWD",
      "خرابی کمپرسور کولر",
      "صدای غیرعادی ترمز عقب"
    ],
    purchaseWarnings: [
      "قطعات مزدا در ایران کمیاب است",
      "تعمیرکار متخصص حتماً داشته باشید"
    ],
    ownerVerdict: "شاسی‌بلندی که مثل سدان اسپرت رانندگی میشه، عاشقشم.",
    overallSummary: "CX-5 شاسی‌بلند لوکس و اسپرت مزدا با رانندگی لذت‌بخش و کیفیت بالاست اما کمبود قطعات و خدمات در ایران چالش اصلی آن است.",
    whyBuy: "اگر رانندگی لذت‌بخش و طراحی لوکس در یک شاسی‌بلند می‌خواهید.",
    whyNotBuy: "اگر دسترسی آسان به قطعات و خدمات برایتان حیاتی است."
  },
  {
    nameEn: "Nissan X-Trail",
    acceleration: 6,
    depreciation: 3,
    repairCost: 6,
    secondHandMarket: 7,
    priceDropRate: 3,
    buildQuality: 7,
    afterSalesService: 5,
    ownerSatisfaction: 7,
    purchaseRisk: 4,
    fuelEconomy: 6,
    suitFamily: 8,
    suitCity: 5,
    suitTravel: 8,
    suitYoung: 4,
    suitInvestment: 6,
    frequentPros: [
      "فضای داخلی بسیار بزرگ",
      "راحتی سفر طولانی",
      "سیستم چهارچرخ‌محرک کارآمد",
      "دوام ژاپنی"
    ],
    frequentCons: [
      "گیربکس CVT نیسان مشکل‌ساز",
      "طراحی داخلی ساده",
      "قطعات نسبتاً گران",
      "شتاب ضعیف با CVT"
    ],
    commonIssues: [
      "خرابی CVT نیسان (مشکل معروف)",
      "نشتی روغن از سیل‌های موتور",
      "خرابی کمپرسور کولر"
    ],
    purchaseWarnings: [
      "CVT نیسان مشکل شناخته‌شده‌ای دارد، حتماً بررسی کنید",
      "کارکرد بالا = ریسک CVT بالا"
    ],
    ownerVerdict: "ماشین خانوادگی خوبی‌ه ولی CVT‌ش نگران‌کننده‌ست.",
    overallSummary: "ایکس‌تریل شاسی‌بلند خانوادگی نیسان با فضای بزرگ و دوام خوب است اما مشکل معروف CVT نیسان ریسک اصلی آن محسوب می‌شود.",
    whyBuy: "اگر فضای بزرگ و راحتی سفر اولویت شماست و CVT را بررسی کرده‌اید.",
    whyNotBuy: "اگر نگران مشکلات CVT هستید یا شتاب خوب می‌خواهید."
  },
  {
    nameEn: "Honda CR-V",
    acceleration: 7,
    depreciation: 2,
    repairCost: 7,
    secondHandMarket: 9,
    priceDropRate: 2,
    buildQuality: 9,
    afterSalesService: 5,
    ownerSatisfaction: 9,
    purchaseRisk: 2,
    fuelEconomy: 6,
    suitFamily: 8,
    suitCity: 6,
    suitTravel: 9,
    suitYoung: 5,
    suitInvestment: 9,
    frequentPros: [
      "قابلیت اطمینان فوق‌العاده موتور هوندا",
      "حفظ ارزش بی‌نظیر",
      "دوام مکانیکی بالا",
      "فضای داخلی هوشمندانه و کاربردی",
      "عملکرد عالی موتور VTEC"
    ],
    frequentCons: [
      "قیمت خرید بسیار بالا",
      "قطعات اصلی بسیار گران و کمیاب",
      "نمایندگی رسمی در ایران وجود ندارد",
      "امکانات فناورانه کمتر از رقبای کره‌ای"
    ],
    commonIssues: [
      "ساییدگی لنت و دیسک ترمز",
      "مشکلات کمپرسور کولر",
      "خرابی سنسور اکسیژن"
    ],
    purchaseWarnings: [
      "تعمیرکار متخصص هوندا حتماً داشته باشید",
      "فقط قطعات اصلی خریداری کنید"
    ],
    ownerVerdict: "بهترین شاسی‌بلندی که تجربه کردم، موتورش خستگی‌ناپذیره.",
    overallSummary: "CR-V با موتور افسانه‌ای هوندا و حفظ ارزش بی‌نظیر، یکی از بهترین شاسی‌بلندهای بازار ایران است اما قیمت و دسترسی به قطعات چالش اصلی آن است.",
    whyBuy: "اگر بودجه بالایی دارید و بالاترین دوام و حفظ ارزش را می‌خواهید.",
    whyNotBuy: "اگر به نمایندگی رسمی و دسترسی آسان به قطعات نیاز دارید."
  },
  {
    nameEn: "Honda Civic",
    acceleration: 7,
    depreciation: 2,
    repairCost: 7,
    secondHandMarket: 9,
    priceDropRate: 2,
    buildQuality: 9,
    afterSalesService: 5,
    ownerSatisfaction: 8,
    purchaseRisk: 2,
    fuelEconomy: 7,
    suitFamily: 6,
    suitCity: 7,
    suitTravel: 6,
    suitYoung: 9,
    suitInvestment: 8,
    frequentPros: [
      "موتور VTEC افسانه‌ای و بادوام",
      "رانندگی فوق‌العاده لذت‌بخش",
      "حفظ ارزش عالی",
      "مصرف سوخت خوب",
      "طراحی اسپرت و جذاب"
    ],
    frequentCons: [
      "قیمت خرید بسیار بالا",
      "قطعات اصلی بسیار گران",
      "نمایندگی رسمی وجود ندارد",
      "تعلیق سفت روی دست‌انداز"
    ],
    commonIssues: [
      "مشکلات کمپرسور کولر",
      "خرابی سنسور VTEC",
      "ساییدگی زودرس لنت ترمز"
    ],
    purchaseWarnings: [
      "قطعات متفرقه زیاد است، فقط اصلی بخرید",
      "تعمیرکار متخصص هوندا پیدا کنید"
    ],
    ownerVerdict: "سدان اسپرت واقعی با موتور بی‌نظیر، هر بار سوارش میشم لبخند میزنم.",
    overallSummary: "سیویک با موتور افسانه‌ای VTEC و رانندگی لذت‌بخش، یکی از بهترین سدان‌های اسپرت بازار ایران است با حفظ ارزش فوق‌العاده.",
    whyBuy: "اگر لذت رانندگی و موتور بادوام با حفظ ارزش عالی می‌خواهید.",
    whyNotBuy: "اگر به نمایندگی رسمی و قطعات ارزان نیاز دارید."
  },

  // ─── European + Other Cars ─────────────────────────────────
  {
    nameEn: "Peugeot 2008",
    acceleration: 6,
    depreciation: 4,
    repairCost: 6,
    secondHandMarket: 7,
    priceDropRate: 4,
    buildQuality: 7,
    afterSalesService: 5,
    ownerSatisfaction: 7,
    purchaseRisk: 4,
    fuelEconomy: 7,
    suitFamily: 6,
    suitCity: 8,
    suitTravel: 6,
    suitYoung: 8,
    suitInvestment: 6,
    frequentPros: [
      "طراحی فرانسوی شیک و متفاوت",
      "کابین لوکس و باکیفیت",
      "رانندگی لذت‌بخش در شهر",
      "مصرف سوخت اقتصادی",
      "سیستم i-Cockpit جذاب"
    ],
    frequentCons: [
      "فضای عقب تنگ",
      "قطعات اصلی گران",
      "خدمات پس از فروش در ایران محدود",
      "تعلیق سفت روی دست‌انداز"
    ],
    commonIssues: [
      "مشکلات گیربکس اتوماتیک EAT6",
      "خرابی سنسورهای پارک",
      "مشکلات سیستم استارت-استاپ"
    ],
    purchaseWarnings: [
      "گیربکس را حتماً در ترافیک تست کنید",
      "قطعات فرانسوی در ایران گران است"
    ],
    ownerVerdict: "ماشین شیک و لوکسی با حس‌وحال اروپایی، ولی قطعاتش گرونه.",
    overallSummary: "پژو ۲۰۰۸ کراس‌اوور شیک فرانسوی با طراحی لوکس و رانندگی لذت‌بخش است اما فضای محدود و قطعات گران از چالش‌های آن در بازار ایران است.",
    whyBuy: "اگر طراحی اروپایی شیک و رانندگی لذت‌بخش شهری می‌خواهید.",
    whyNotBuy: "اگر فضای خانوادگی بزرگ یا هزینه نگهداری پایین نیاز دارید."
  },
  {
    nameEn: "Renault Koleos",
    acceleration: 7,
    depreciation: 4,
    repairCost: 6,
    secondHandMarket: 6,
    priceDropRate: 4,
    buildQuality: 7,
    afterSalesService: 5,
    ownerSatisfaction: 7,
    purchaseRisk: 4,
    fuelEconomy: 5,
    suitFamily: 8,
    suitCity: 5,
    suitTravel: 8,
    suitYoung: 4,
    suitInvestment: 5,
    frequentPros: [
      "فضای داخلی بسیار بزرگ و لوکس",
      "راحتی استثنایی در سفر",
      "موتور قوی و روان",
      "کیفیت ساخت بالا"
    ],
    frequentCons: [
      "مصرف سوخت بالا",
      "قطعات گران و کمیاب",
      "برند رنو در ایران ضعیف شده",
      "خدمات پس از فروش محدود"
    ],
    commonIssues: [
      "مشکلات CVT نیسان (پلتفرم مشترک)",
      "خرابی سنسورهای ADAS",
      "نشتی روغن گیربکس"
    ],
    purchaseWarnings: [
      "CVT مشابه نیسان است و مشکلات مشترک دارد",
      "نمایندگی رنو در ایران محدود شده"
    ],
    ownerVerdict: "ماشین بزرگ و راحتی‌ه، برای سفر عالیه ولی قطعاتش دردسر داره.",
    overallSummary: "کولئوس شاسی‌بلند بزرگ و لوکس رنو با فضای عالی و راحتی سفر است اما مشکلات CVT و کمبود خدمات در ایران از نقاط ضعف آن است.",
    whyBuy: "اگر فضای بزرگ و راحتی سفر اولویت شماست.",
    whyNotBuy: "اگر به خدمات گسترده و قطعات ارزان نیاز دارید."
  },
  {
    nameEn: "BYD Song Plus",
    acceleration: 8,
    depreciation: 5,
    repairCost: 5,
    secondHandMarket: 5,
    priceDropRate: 5,
    buildQuality: 7,
    afterSalesService: 4,
    ownerSatisfaction: 7,
    purchaseRisk: 5,
    fuelEconomy: 9,
    suitFamily: 7,
    suitCity: 8,
    suitTravel: 7,
    suitYoung: 7,
    suitInvestment: 5,
    frequentPros: [
      "شتاب فوق‌العاده (موتور الکتریکی/هیبرید)",
      "مصرف سوخت بسیار پایین",
      "تکنولوژی و امکانات پیشرفته",
      "طراحی مدرن و جذاب",
      "صفحه‌نمایش چرخشی بزرگ"
    ],
    frequentCons: [
      "باتری و تعمیرات تخصصی گران",
      "زیرساخت شارژ محدود در ایران",
      "بازار دست‌دوم نامشخص",
      "برند جدید و ثابت‌نشده"
    ],
    commonIssues: [
      "مشکلات نرم‌افزاری سیستم مالتی‌مدیا",
      "خرابی سنسورهای ADAS",
      "مشکلات سیستم شارژ"
    ],
    purchaseWarnings: [
      "زیرساخت شارژ در شهرتان را بررسی کنید",
      "هزینه تعویض باتری بسیار بالاست",
      "بازار فروش هنوز شکل نگرفته"
    ],
    ownerVerdict: "شتابش دیوانه‌کننده‌ست و هزینه سوختش تقریباً صفره، ولی نگران آینده‌ام.",
    overallSummary: "BYD Song Plus با شتاب فوق‌العاده و مصرف بسیار پایین، آینده خودروی ایران را نشان می‌دهد اما زیرساخت شارژ و بازار دست‌دوم هنوز بالغ نشده است.",
    whyBuy: "اگر تکنولوژی و مصرف پایین اولویت شماست و به آینده الکتریکی اعتقاد دارید.",
    whyNotBuy: "اگر نگران زیرساخت شارژ، ارزش آتی و هزینه باتری هستید."
  },
  {
    nameEn: "BYD Atto 3",
    acceleration: 8,
    depreciation: 5,
    repairCost: 6,
    secondHandMarket: 4,
    priceDropRate: 6,
    buildQuality: 7,
    afterSalesService: 4,
    ownerSatisfaction: 7,
    purchaseRisk: 6,
    fuelEconomy: 10,
    suitFamily: 6,
    suitCity: 9,
    suitTravel: 5,
    suitYoung: 8,
    suitInvestment: 4,
    frequentPros: [
      "تمام‌الکتریکی با هزینه سوخت نزدیک صفر",
      "شتاب فوق‌العاده",
      "تکنولوژی و امکانات پیشرفته",
      "طراحی داخلی خلاقانه و متفاوت"
    ],
    frequentCons: [
      "برد محدود باتری",
      "زیرساخت شارژ ضعیف در ایران",
      "هزینه تعویض باتری فاجعه‌بار",
      "بازار فروش دست‌دوم تقریباً وجود ندارد",
      "نامناسب برای سفرهای بین‌شهری طولانی"
    ],
    commonIssues: [
      "کاهش ظرفیت باتری در گرما و سرما",
      "مشکلات نرم‌افزاری",
      "خرابی سیستم شارژ سریع"
    ],
    purchaseWarnings: [
      "فقط برای شهرهای بزرگ با زیرساخت شارژ مناسب است",
      "هزینه باتری می‌تواند نصف قیمت ماشین باشد",
      "بازار فروش فعلاً وجود ندارد"
    ],
    ownerVerdict: "تجربه رانندگی متفاوتی‌ه، ولی اضطراب شارژ واقعیه.",
    overallSummary: "Atto 3 تجربه‌ای کاملاً متفاوت از رانندگی الکتریکی ارائه می‌دهد اما محدودیت‌های زیرساخت شارژ و بازار دست‌دوم در ایران، خرید آن را پرریسک می‌کند.",
    whyBuy: "اگر عاشق تکنولوژی هستید، شارژ خانگی دارید و عمدتاً در شهر رانندگی می‌کنید.",
    whyNotBuy: "اگر سفرهای بین‌شهری زیاد دارید یا نگران ارزش آتی و باتری هستید."
  },
  {
    nameEn: "Geely Emgrand",
    acceleration: 5,
    depreciation: 5,
    repairCost: 4,
    secondHandMarket: 5,
    priceDropRate: 5,
    buildQuality: 6,
    afterSalesService: 4,
    ownerSatisfaction: 6,
    purchaseRisk: 5,
    fuelEconomy: 7,
    suitFamily: 6,
    suitCity: 7,
    suitTravel: 5,
    suitYoung: 6,
    suitInvestment: 4,
    frequentPros: [
      "قیمت مناسب نسبت به امکانات",
      "مصرف سوخت اقتصادی",
      "کیفیت ساخت خوب برای قیمتش",
      "امکانات رفاهی قابل‌قبول"
    ],
    frequentCons: [
      "برند جدید در ایران",
      "بازار فروش دست‌دوم ضعیف",
      "خدمات پس از فروش محدود",
      "قطعات یدکی کمیاب"
    ],
    commonIssues: [
      "مشکلات CVT در گرما",
      "خرابی سنسورهای پارک",
      "صدای غیرعادی تعلیق"
    ],
    purchaseWarnings: [
      "برند جدید است و بازار دست‌دوم شکل نگرفته",
      "قطعات یدکی ممکن است دیر برسد"
    ],
    ownerVerdict: "سدان خوب و مقرون‌به‌صرفه‌ای‌ه، ولی باید صبر کرد ببینیم بازارش چطور میشه.",
    overallSummary: "جیلی امگرند سدان مقرون‌به‌صرفه‌ای با امکانات خوب و مصرف سوخت پایین است اما جدید بودن برند در ایران و کمبود قطعات ریسک خرید آن را بالا می‌برد.",
    whyBuy: "اگر سدان اقتصادی با امکانات مناسب می‌خواهید و ریسک برند جدید را می‌پذیرید.",
    whyNotBuy: "اگر به بازار فروش مطمئن و خدمات گسترده نیاز دارید."
  },
  {
    nameEn: "Geely Coolray",
    acceleration: 7,
    depreciation: 5,
    repairCost: 5,
    secondHandMarket: 5,
    priceDropRate: 5,
    buildQuality: 7,
    afterSalesService: 4,
    ownerSatisfaction: 7,
    purchaseRisk: 5,
    fuelEconomy: 6,
    suitFamily: 5,
    suitCity: 8,
    suitTravel: 6,
    suitYoung: 8,
    suitInvestment: 4,
    frequentPros: [
      "طراحی اسپرت و جذاب",
      "موتور توربو با شتاب عالی",
      "امکانات فناورانه پیشرفته",
      "کیفیت ساخت بالا (پلتفرم ولوو)",
      "رانندگی لذت‌بخش"
    ],
    frequentCons: [
      "فضای عقب کوچک",
      "برند جدید در ایران",
      "بازار فروش دست‌دوم نامشخص",
      "قطعات یدکی محدود"
    ],
    commonIssues: [
      "مشکلات گیربکس DCT در ترافیک",
      "خرابی سنسورهای ADAS",
      "مشکلات نرم‌افزاری صفحه‌نمایش"
    ],
    purchaseWarnings: [
      "گیربکس DCT در ترافیک سنگین مشکل‌ساز می‌شود",
      "بازار فروش هنوز شکل نگرفته"
    ],
    ownerVerdict: "کراس‌اوور اسپرت و باکیفیتی‌ه، شتابش عالیه ولی بازارش نامشخصه.",
    overallSummary: "جیلی کولری کراس‌اوور اسپرت و باکیفیتی روی پلتفرم ولوو با شتاب عالی است اما جدید بودن برند و نامشخص بودن بازار آتی ریسک خرید دارد.",
    whyBuy: "اگر یک کراس‌اوور اسپرت و باکیفیت با شتاب عالی می‌خواهید.",
    whyNotBuy: "اگر نقدشوندگی و خدمات گسترده برایتان ضروری است."
  }
];

async function main() {
  console.log("🚗 Starting CarIntelligence seeding...");

  // Delete existing records
  const deleted = await prisma.carIntelligence.deleteMany();
  console.log(`🗑️  Deleted ${deleted.count} existing CarIntelligence records`);

  let created = 0;
  let skipped = 0;

  for (const data of intelligenceData) {
    const { nameEn, ...intel } = data;

    // Look up car by nameEn
    const car = await prisma.car.findFirst({ where: { nameEn } });
    if (!car) {
      console.warn(`⚠️  Car not found: ${nameEn} — skipping`);
      skipped++;
      continue;
    }

    await prisma.carIntelligence.create({
      data: {
        carId: car.id,
        ...intel
      }
    });

    created++;
    console.log(`✅ [${created}/${intelligenceData.length}] ${nameEn}`);
  }

  console.log(`\n🏁 Done! Created: ${created}, Skipped: ${skipped}`);
}

main()
  .catch((e) => {
    console.error("❌ Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });

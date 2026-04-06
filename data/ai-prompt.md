# پرامپت استخراج اطلاعات خودرو برای ماشینچی

این پرامپت را به ChatGPT یا Claude بدهید. نام خودرو را جایگزین کنید.

---

## پرامپت:

برای خودروی **[نام خودرو]** در بازار ایران، اطلاعات کامل زیر را به فرمت JSON استخراج کن.

قوانین:
- قیمت‌ها به تومان بازار ایران ۱۴۰۳-۱۴۰۴ باشد (عدد صحیح بدون جداکننده)
- امتیازها عدد صحیح از ۱ تا ۱۰
- تمام توضیحات و متن‌ها به فارسی باشد
- آرایه‌ها حداقل ۳ آیتم داشته باشند
- اگر اطلاعاتی موجود نیست null بگذار
- فقط JSON خالص برگردان، بدون توضیح اضافه

```json
{
  "nameEn": "Brand Model",
  "nameFa": "نام فارسی خودرو",
  "brand": "Brand",
  "brandFa": "برند فارسی",
  "category": "sedan|suv|hatchback|crossover|pickup",
  "year": 1403,
  "priceMin": 0,
  "priceMax": 0,
  "origin": "iranian|chinese|korean|japanese|european",
  "description": "یک جمله توصیف کوتاه فارسی",
  "tags": ["تگ۱", "تگ۲", "تگ۳"],

  "scores": {
    "comfort": 0,
    "performance": 0,
    "economy": 0,
    "safety": 0,
    "prestige": 0,
    "reliability": 0,
    "resaleValue": 0,
    "familyFriendly": 0,
    "sportiness": 0,
    "offroad": 0,
    "cityDriving": 0,
    "longTrip": 0,
    "maintenanceRisk": 0,
    "afterSales": 0
  },

  "specs": {
    "engine": "1.5L Turbo",
    "horsepower": 0,
    "torque": 0,
    "transmission": "automatic|manual|CVT",
    "fuelType": "gasoline|diesel|hybrid|electric",
    "fuelConsumption": 0.0,
    "acceleration": 0.0,
    "trunkVolume": 0,
    "groundClearance": 0,
    "length": 0,
    "width": 0,
    "weight": 0,
    "seatingCapacity": 5
  },

  "intelligence": {
    "acceleration": 0,
    "depreciation": 0,
    "repairCost": 0,
    "secondHandMarket": 0,
    "priceDropRate": 0,
    "buildQuality": 0,
    "afterSalesService": 0,
    "ownerSatisfaction": 0,
    "purchaseRisk": 0,
    "fuelEconomy": 0,
    "suitFamily": 0,
    "suitCity": 0,
    "suitTravel": 0,
    "suitYoung": 0,
    "suitInvestment": 0,
    "frequentPros": [
      "نقطه قوت ۱",
      "نقطه قوت ۲",
      "نقطه قوت ۳"
    ],
    "frequentCons": [
      "نقطه ضعف ۱",
      "نقطه ضعف ۲",
      "نقطه ضعف ۳"
    ],
    "commonIssues": [
      "مشکل رایج ۱",
      "مشکل رایج ۲",
      "مشکل رایج ۳"
    ],
    "purchaseWarnings": [
      "هشدار خرید ۱",
      "هشدار خرید ۲"
    ],
    "ownerVerdict": "خلاصه نظر مالکان در یک جمله",
    "overallSummary": "جمع‌بندی کلی خودرو در ۲-۳ جمله",
    "whyBuy": "چرا این خودرو را بخریم - یک پاراگراف کوتاه",
    "whyNotBuy": "چرا این خودرو را نخریم - یک پاراگراف کوتاه"
  }
}
```

### راهنمای امتیازدهی scores:
- comfort: راحتی سواری و صندلی
- performance: قدرت موتور و شتاب
- economy: مصرف سوخت + هزینه نگهداری
- safety: ایمنی فعال و غیرفعال
- prestige: وجهه اجتماعی و برند
- reliability: قابلیت اطمینان و دوام
- resaleValue: نقدشوندگی در بازار دست دوم
- familyFriendly: مناسب خانواده
- sportiness: حس اسپرت و هیجان
- offroad: توانایی آفرود
- cityDriving: مناسب رانندگی شهری
- longTrip: مناسب سفرهای طولانی
- maintenanceRisk: ریسک خرابی (۱۰ = خیلی پرریسک)
- afterSales: کیفیت خدمات پس از فروش

### راهنمای امتیازدهی intelligence:
- acceleration: شتاب‌گیری
- depreciation: استهلاک (۱۰ = خیلی مستهلک)
- repairCost: هزینه تعمیر (۱۰ = خیلی گران)
- secondHandMarket: بازار دست دوم (۱۰ = خیلی خوب)
- priceDropRate: سرعت افت قیمت (۱۰ = خیلی سریع)
- buildQuality: کیفیت ساخت
- afterSalesService: خدمات پس از فروش
- ownerSatisfaction: رضایت مالکان
- purchaseRisk: ریسک خرید (۱۰ = خیلی پرریسک)
- fuelEconomy: صرفه‌جویی سوخت
- suitFamily: مناسب خانواده
- suitCity: مناسب شهر
- suitTravel: مناسب سفر
- suitYoung: مناسب جوانان
- suitInvestment: مناسب سرمایه‌گذاری

---

## برای استخراج دسته‌ای (چند خودرو):

پرامپت بالا را بده و بگو:

> این اطلاعات را برای خودروهای زیر استخراج کن و به صورت آرایه JSON برگردان:
> 1. [خودرو ۱]
> 2. [خودرو ۲]
> 3. [خودرو ۳]

---

## نحوه import در اپ:

۱. خروجی JSON را در فایل ذخیره کنید: `data/new-cars.json`
۲. اجرا کنید:
```bash
npm run db:import -- data/new-cars.json
```

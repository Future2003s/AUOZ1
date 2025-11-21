# 🌍 ShopDev Internationalization (i18n) Guide

## Quick Start

### 1. Supported Languages
- 🇻🇳 **Vietnamese (vi)** - Tiếng Việt
- 🇺🇸 **English (en)** - English (Default)
- 🇯🇵 **Japanese (ja)** - 日本語

### 2. Seed Default Translations
```bash
npm run seed:translations
```

### 3. Test Translation APIs
```bash
# Get all translations in Vietnamese
curl "http://localhost:8081/api/v1/translations/all?lang=vi"

# Get specific translation in Japanese
curl "http://localhost:8081/api/v1/translations/key/ui.welcome?lang=ja"

# Get translations by category
curl "http://localhost:8081/api/v1/translations/category/product?lang=vi"
```

## 🔧 Translation System Features

### Multi-Language Support
- **Automatic Language Detection**: From Accept-Language header, query params, or user preferences
- **Fallback System**: Falls back to English if translation not found
- **Caching**: Redis-based caching for high performance
- **Real-time Updates**: Cache invalidation on translation changes

### Translation Categories
- `product` - Product-related translations
- `category` - Category translations
- `brand` - Brand translations
- `ui` - User interface elements
- `error` - Error messages
- `success` - Success messages
- `validation` - Validation messages
- `email` - Email templates
- `notification` - Notification messages

## 📊 API Endpoints

### Public Translation APIs

#### Get Single Translation
```http
GET /api/v1/translations/key/:key?lang=:language
```
**Example:**
```bash
curl "http://localhost:8081/api/v1/translations/key/ui.welcome?lang=vi"
```
**Response:**
```json
{
  "success": true,
  "message": "Translation retrieved successfully",
  "data": {
    "key": "ui.welcome",
    "translation": "Chào mừng",
    "language": "vi"
  }
}
```

#### Get Multiple Translations
```http
POST /api/v1/translations/bulk?lang=:language
Content-Type: application/json

{
  "keys": ["ui.welcome", "ui.login", "ui.register"]
}
```

#### Get Translations by Category
```http
GET /api/v1/translations/category/:category?lang=:language
```
**Example:**
```bash
curl "http://localhost:8081/api/v1/translations/category/ui?lang=ja"
```

#### Get All Translations
```http
GET /api/v1/translations/all?lang=:language
```

### Admin Translation Management APIs

#### List Translations (Paginated)
```http
GET /api/v1/translations?page=1&limit=20&category=ui&search=welcome
Authorization: Bearer <admin_token>
```

#### Create Translation
```http
POST /api/v1/translations
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "key": "ui.new_feature",
  "category": "ui",
  "translations": {
    "vi": "Tính năng mới",
    "en": "New Feature",
    "ja": "新機能"
  },
  "description": "New feature button text"
}
```

#### Update Translation
```http
PUT /api/v1/translations/:key
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "translations": {
    "vi": "Tính năng đã cập nhật",
    "en": "Updated Feature",
    "ja": "更新された機能"
  },
  "description": "Updated description"
}
```

#### Delete Translation
```http
DELETE /api/v1/translations/:key
Authorization: Bearer <admin_token>
```

#### Search Translations
```http
GET /api/v1/translations/search?query=welcome&language=vi&category=ui
Authorization: Bearer <admin_token>
```

#### Get Translation Statistics
```http
GET /api/v1/translations/stats
Authorization: Bearer <admin_token>
```

#### Bulk Import Translations
```http
POST /api/v1/translations/bulk-import
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "translations": [
    {
      "key": "ui.button1",
      "category": "ui",
      "translations": {
        "vi": "Nút 1",
        "en": "Button 1",
        "ja": "ボタン1"
      }
    }
  ]
}
```

#### Export Translations
```http
GET /api/v1/translations/export?category=ui&language=vi
Authorization: Bearer <admin_token>
```

## 🛠️ Using Translations in Code

### In Controllers/Middleware
```typescript
import { Request, Response } from 'express';

// Using async translation
export const someController = async (req: Request, res: Response) => {
  const message = await req.t('success.login');
  res.json({ message });
};

// Using sync translation (from preloaded cache)
export const anotherController = (req: Request, res: Response) => {
  const message = req.tSync('error.invalid_credentials');
  res.status(400).json({ error: message });
};
```

### Using Translation Service Directly
```typescript
import { translationService } from '../services/translationService';
import { SupportedLanguages } from '../models/Translation';

// Get single translation
const welcomeMessage = await translationService.getTranslation(
  'ui.welcome', 
  SupportedLanguages.VIETNAMESE
);

// Get multiple translations
const translations = await translationService.getTranslations(
  ['ui.welcome', 'ui.login'], 
  SupportedLanguages.JAPANESE
);

// Get by category
const uiTranslations = await translationService.getTranslationsByCategory(
  TranslationCategories.UI,
  SupportedLanguages.ENGLISH
);
```

### Using Helper Functions
```typescript
import { 
  getLocalizedError, 
  getLocalizedSuccess,
  formatCurrency,
  formatDate 
} from '../utils/i18nHelpers';

// Get localized error message
const errorMsg = await getLocalizedError('user_not_found', language);

// Format currency by language
const price = formatCurrency(1000, SupportedLanguages.VIETNAMESE); // "1.000 ₫"

// Format date by language
const date = formatDate(new Date(), SupportedLanguages.JAPANESE);
```

## 🎯 Best Practices

### Translation Key Naming
- Use dot notation: `category.subcategory.key`
- Use lowercase with underscores: `ui.add_to_cart`
- Be descriptive: `error.product_not_found` vs `error.e1`

### Translation Content
- Keep translations concise and clear
- Consider cultural context, not just literal translation
- Use placeholders for dynamic content: `"Welcome {name}"`
- Test with longer text (German, Japanese) for UI layout

### Performance Optimization
- Use category-based loading for large translation sets
- Preload common translations (UI, errors, validation)
- Cache frequently accessed translations
- Use bulk operations for multiple translations

### Content Management
- Organize translations by feature/module
- Use meaningful descriptions for context
- Version control translation changes
- Regular translation audits and updates

## 📋 Default Translations Included

### UI Elements
- `ui.welcome` - Welcome message
- `ui.login` - Login button
- `ui.register` - Register button
- `ui.logout` - Logout button
- `ui.search` - Search placeholder
- `ui.add_to_cart` - Add to cart button
- `ui.checkout` - Checkout button

### Error Messages
- `error.invalid_credentials` - Invalid login
- `error.user_not_found` - User not found
- `error.product_not_found` - Product not found
- `error.insufficient_stock` - Stock error

### Success Messages
- `success.login` - Login success
- `success.register` - Registration success
- `success.product_added` - Product added to cart
- `success.order_placed` - Order placed

### Validation Messages
- `validation.required` - Required field
- `validation.email_invalid` - Invalid email
- `validation.password_min_length` - Password length

### Product Related
- `product.price` - Price label
- `product.description` - Description label
- `product.category` - Category label
- `product.brand` - Brand label
- `product.in_stock` - In stock status
- `product.out_of_stock` - Out of stock status

## 🔧 Configuration

### Environment Variables
```env
# Default language
DEFAULT_LANGUAGE=en

# Cache settings for translations
TRANSLATION_CACHE_TTL=3600
```

### User Language Preferences
Users can set their preferred language in their profile:
```json
{
  "preferences": {
    "language": "vi"
  }
}
```

## 🚀 Advanced Features

### Language Detection Priority
1. Query parameter: `?lang=vi`
2. Accept-Language header
3. User preference (if authenticated)
4. Default to English

### Cache Strategy
- **Individual translations**: 1 hour TTL
- **Category translations**: 1 hour TTL
- **All translations**: 30 minutes TTL
- **Automatic invalidation** on updates

### Performance Monitoring
- Cache hit/miss ratios
- Translation lookup times
- Most requested translations
- Language usage statistics

## 📞 Support

### Translation Management Commands
```bash
# Seed default translations
npm run seed:translations

# Clean up duplicate indexes
npm run cleanup:indexes

# Test Redis connection
npm run test:redis
```

### Troubleshooting
1. **Translation not found**: Check if key exists and is active
2. **Cache issues**: Clear Redis cache or restart server
3. **Performance issues**: Monitor cache hit rates
4. **Language detection**: Check Accept-Language header format

The ShopDev i18n system is now ready for multi-language e-commerce! 🌍🛒

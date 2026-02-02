/**
 * Product Images Configuration
 * 
 * Quản lý URLs ảnh cho các sản phẩm nước ép vải
 * 
 * Hướng dẫn:
 * 1. Thay thế các URL placeholder bằng URLs ảnh thực tế của bạn
 * 2. Ảnh nên được host trên CDN hoặc server của bạn
 * 3. Kích thước khuyến nghị: 1200x1200px hoặc lớn hơn
 * 4. Format: JPG, PNG, hoặc WebP
 * 5. Mỗi sản phẩm có thể có nhiều ảnh (ảnh chính + ảnh phụ)
 */

export interface ProductImage {
    url: string;
    alt: string;
    isMain: boolean;
    order: number;
}

export const PRODUCT_IMAGES: Record<string, ProductImage[]> = {
    "nuoc-ep-vai-thieu": [
        {
            url: "https://images.unsplash.com/photo-1600271886742-f049cd451bba?w=1200&h=1200&fit=crop",
            alt: "Nước Ép Vải Thiều - Chai 250ml - LALA-LYCHEEE",
            isMain: true,
            order: 0
        },
        {
            url: "https://images.unsplash.com/photo-1600271886742-f049cd451bba?w=1200&h=1200&fit=crop",
            alt: "Nước Ép Vải Thiều - Thành phần tự nhiên 100%",
            isMain: false,
            order: 1
        },
        {
            url: "https://images.unsplash.com/photo-1600271886742-f049cd451bba?w=1200&h=1200&fit=crop",
            alt: "Nước Ép Vải Thiều - Từ vải thiều Thanh Hà",
            isMain: false,
            order: 2
        }
    ],
    "nuoc-ep-vai-phoi-tron": [
        {
            url: "https://images.unsplash.com/photo-1600271886742-f049cd451bba?w=1200&h=1200&fit=crop",
            alt: "Nước Ép Vải Phối Trộn - Chai 250ml - LALA-LYCHEEE",
            isMain: true,
            order: 0
        },
        {
            url: "https://images.unsplash.com/photo-1600271886742-f049cd451bba?w=1200&h=1200&fit=crop",
            alt: "Nước Ép Vải Phối Trộn - Hương vị đặc biệt kết hợp nhiều loại vải",
            isMain: false,
            order: 1
        },
        {
            url: "https://images.unsplash.com/photo-1600271886742-f049cd451bba?w=1200&h=1200&fit=crop",
            alt: "Nước Ép Vải Phối Trộn - Bảng dinh dưỡng",
            isMain: false,
            order: 2
        }
    ],
    "nuoc-ep-vai-tau-lai": [
        {
            url: "https://images.unsplash.com/photo-1600271886742-f049cd451bba?w=1200&h=1200&fit=crop",
            alt: "Nước Ép Vải Tàu Lai - Chai 250ml - LALA-LYCHEEE",
            isMain: true,
            order: 0
        },
        {
            url: "https://images.unsplash.com/photo-1600271886742-f049cd451bba?w=1200&h=1200&fit=crop",
            alt: "Nước Ép Vải Tàu Lai - Vị ngọt mát, thơm dịu",
            isMain: false,
            order: 1
        }
    ],
    "nuoc-ep-vai-u-hong": [
        {
            url: "https://images.unsplash.com/photo-1600271886742-f049cd451bba?w=1200&h=1200&fit=crop",
            alt: "Nước Ép Vải U Hồng - Chai 250ml - LALA-LYCHEEE",
            isMain: true,
            order: 0
        },
        {
            url: "https://images.unsplash.com/photo-1600271886742-f049cd451bba?w=1200&h=1200&fit=crop",
            alt: "Nước Ép Vải U Hồng - Màu sắc tự nhiên đẹp mắt",
            isMain: false,
            order: 1
        },
        {
            url: "https://images.unsplash.com/photo-1600271886742-f049cd451bba?w=1200&h=1200&fit=crop",
            alt: "Nước Ép Vải U Hồng - Chất lượng cao từ Thanh Hà",
            isMain: false,
            order: 2
        }
    ]
};

/**
 * Get images for a product by slug
 */
export function getProductImages(slug: string): ProductImage[] {
    return PRODUCT_IMAGES[slug] || [
        {
            url: "https://images.unsplash.com/photo-1600271886742-f049cd451bba?w=1200&h=1200&fit=crop",
            alt: `Product image for ${slug}`,
            isMain: true,
            order: 0
        }
    ];
}

/**
 * Example URLs structure for reference:
 * 
 * Local/Server:
 * - "https://yourdomain.com/uploads/products/nuoc-ep-vai-thieu-1.jpg"
 * - "https://yourdomain.com/uploads/products/nuoc-ep-vai-thieu-2.jpg"
 * 
 * CDN (Cloudinary, AWS S3, etc.):
 * - "https://res.cloudinary.com/your-cloud/image/upload/v1234567890/products/nuoc-ep-vai-thieu.jpg"
 * - "https://your-bucket.s3.amazonaws.com/products/nuoc-ep-vai-thieu.jpg"
 * 
 * External hosting:
 * - "https://imgur.com/abc123.jpg"
 * - "https://i.imgur.com/abc123.jpg"
 */

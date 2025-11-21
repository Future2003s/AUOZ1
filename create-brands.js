const mongoose = require("mongoose");

// Connect to database
mongoose.connect("mongodb://localhost:27017/ShopDev");

// Brand schema
const brandSchema = new mongoose.Schema(
    {
        name: { type: String, required: true },
        description: String,
        slug: { type: String, required: true, unique: true },
        logo: String,
        website: String,
        isActive: { type: Boolean, default: true },
        sortOrder: { type: Number, default: 0 },
        productCount: { type: Number, default: 0 },
        seo: {
            title: String,
            description: String,
            keywords: [String]
        }
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true }
    }
);

const Brand = mongoose.model("Brand", brandSchema);

// Sample brands
const brands = [
    {
        name: "Apple",
        slug: "apple",
        description: "Apple Inc. products",
        website: "https://apple.com",
        isActive: true
    },
    {
        name: "Samsung",
        slug: "samsung",
        description: "Samsung Electronics",
        website: "https://samsung.com",
        isActive: true
    },
    {
        name: "Dell",
        slug: "dell",
        description: "Dell Technologies",
        website: "https://dell.com",
        isActive: true
    },
    {
        name: "TechCorp",
        slug: "techcorp",
        description: "Leading technology brand",
        isActive: true,
        sortOrder: 1
    },
    {
        name: "FashionPlus",
        slug: "fashionplus",
        description: "Premium fashion brand",
        isActive: true,
        sortOrder: 2
    },
    {
        name: "BookWorld",
        slug: "bookworld",
        description: "Quality book publisher",
        isActive: true,
        sortOrder: 3
    }
];

async function createBrands() {
    try {
        console.log("Creating brands...");

        // Clear existing brands
        await Brand.deleteMany({});
        console.log("Cleared existing brands");

        // Create new brands
        const created = await Brand.insertMany(brands);
        console.log(`Created ${created.length} brands:`);

        created.forEach((brand) => {
            console.log(`- ${brand.name} (${brand.slug}) - ID: ${brand._id}`);
        });

        console.log("Brands created successfully!");
        process.exit(0);
    } catch (error) {
        console.error("Error creating brands:", error);
        process.exit(1);
    }
}

createBrands();

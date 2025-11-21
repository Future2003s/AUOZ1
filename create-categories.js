const mongoose = require("mongoose");

// Connect to database
mongoose.connect("mongodb://localhost:27017/ShopDev", {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

// Category schema
const categorySchema = new mongoose.Schema(
    {
        name: { type: String, required: true },
        description: String,
        slug: { type: String, required: true, unique: true },
        parent: { type: mongoose.Schema.Types.ObjectId, ref: "Category", default: null },
        image: String,
        icon: String,
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

const Category = mongoose.model("Category", categorySchema);

// Sample categories
const categories = [
    {
        name: "Electronics",
        slug: "electronics",
        description: "Electronic devices and gadgets",
        isActive: true,
        sortOrder: 1,
        seo: {
            title: "Electronics - Latest Tech Gadgets",
            description: "Discover the latest electronic devices and tech gadgets",
            keywords: ["electronics", "gadgets", "technology"]
        }
    },
    {
        name: "Smartphones",
        slug: "smartphones",
        description: "Mobile phones and accessories",
        isActive: true,
        sortOrder: 0
    },
    {
        name: "Laptops",
        slug: "laptops",
        description: "Laptop computers and accessories",
        isActive: true,
        sortOrder: 0
    },
    {
        name: "Clothing",
        slug: "clothing",
        description: "Fashion and apparel",
        isActive: true,
        sortOrder: 2,
        seo: {
            title: "Clothing - Fashion & Apparel",
            description: "Trendy clothing and fashion items",
            keywords: ["clothing", "fashion", "apparel"]
        }
    },
    {
        name: "Books",
        slug: "books",
        description: "Books and literature",
        isActive: true,
        sortOrder: 3,
        seo: {
            title: "Books - Literature & Education",
            description: "Educational books and literature",
            keywords: ["books", "literature", "education"]
        }
    }
];

async function createCategories() {
    try {
        console.log("Creating categories...");

        // Clear existing categories
        await Category.deleteMany({});
        console.log("Cleared existing categories");

        // Create new categories
        const created = await Category.insertMany(categories);
        console.log(`Created ${created.length} categories:`);

        created.forEach((cat) => {
            console.log(`- ${cat.name} (${cat.slug}) - ID: ${cat._id}`);
        });

        console.log("Categories created successfully!");
        process.exit(0);
    } catch (error) {
        console.error("Error creating categories:", error);
        process.exit(1);
    }
}

createCategories();

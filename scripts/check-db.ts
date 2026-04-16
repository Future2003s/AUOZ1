import mongoose from 'mongoose';
import { Product } from '../src/models/Product';
import { Category } from '../src/models/Category';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.join(__dirname, '../.env') });

async function run() {
    try {
        await mongoose.connect(process.env.DATABASE_URI || 'mongodb://localhost:27017/future2003s');
        const products = await Product.find({ isFeatured: true, name: /Nước Ép Vải/i })
            .populate("category", "name slug translations")
            .lean();
        console.log('Total lychee juices found:', products.length);

        products.forEach((p: any) => {
            console.log(`Product: ${p.name}`);
            if (p.category) {
                console.log('  Category Name:', p.category.name);
                console.log('  Category Translations (keys):', Object.keys(p.category.translations || {}));
                if (p.category.translations && p.category.translations.ja) {
                    console.log('  Category JA Name:', p.category.translations.ja.name);
                }
            }
            console.log('---');
        });

        await mongoose.disconnect();
    } catch (error) {
        console.error('Error:', error);
    }
}

run();

import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

mongoose.connect(process.env.DATABASE_URI as string);

import { Product } from './src/models/Product';

async function test() {
    const product = await Product.findOne({ sku: 'NEV-U-HONG-250ML' }).lean();
    if (product) {
        console.log("Product images array:", JSON.stringify(product.images, null, 2));
    } else {
        console.log("Product not found");
    }
    process.exit(0);
}

test();

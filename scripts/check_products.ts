import { connectDatabase } from "../src/config/database";
import { Product } from "../src/models/Product";
import mongoose from "mongoose";

async function run() {
    try {
        await connectDatabase();
        const total = await Product.countDocuments({});
        const honey = await Product.countDocuments({ name: /mật ong|mat ong|honey/i });
        const draft = await Product.countDocuments({ status: "draft" });
        const active = await Product.countDocuments({ status: "active" });
        const archived = await Product.countDocuments({ status: "archived" });
        
        console.log("--- PRODUCT STATS ---");
        console.log(`Total Products: ${total}`);
        console.log(`Honey Products: ${honey}`);
        console.log(`Drafts: ${draft}`);
        console.log(`Active: ${active}`);
        console.log(`Archived: ${archived}`);
        
        // List names of all products
        const all = await Product.find({}, "name status");
        console.log("\n--- NAMES ---");
        all.forEach(p => console.log(`[${p.status}] ${p.name}`));
        
        await mongoose.connection.close();
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}

run();

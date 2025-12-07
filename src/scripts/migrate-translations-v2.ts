import mongoose from "mongoose";
import { Translation } from "../models/Translation";
import { TranslationV2, SupportedLocales, TranslationCategories } from "../models/TranslationV2";
import { buildTranslationKey } from "../utils/translationKeyParser";
import { config } from "../config/config";
import { logger } from "../utils/logger";

/**
 * Migration script to convert V1 translations to V2 format
 * 
 * V1: { key: "nav.home", translations: { vi: "...", en: "...", ja: "..." } }
 * V2: { key: "Label_nav_home_vn", baseKey: "Label_nav_home", locale: "vn", value: "..." }
 */
async function migrateTranslationsV1ToV2() {
    try {
        // Connect to database
        await mongoose.connect(config.database.uri);
        logger.info("Connected to MongoDB");

        // Get all V1 translations
        const v1Translations = await Translation.find({ isActive: true }).lean();
        logger.info(`Found ${v1Translations.length} V1 translations to migrate`);

        const localeMap: Record<string, SupportedLocales> = {
            vi: SupportedLocales.VIETNAMESE,
            en: SupportedLocales.ENGLISH,
            ja: SupportedLocales.JAPANESE
        };

        let migrated = 0;
        let skipped = 0;
        let errors = 0;

        // Create a dummy user ID for migration
        const migrationUserId = new mongoose.Types.ObjectId();

        for (const v1Translation of v1Translations) {
            try {
                // Convert nested key to flat key with prefix
                // "nav.home" -> "Label_nav_home"
                const baseKey = `Label_${v1Translation.key.replace(/\./g, "_")}`;
                
                // Determine category
                let category = TranslationCategories.UI;
                if (v1Translation.category === "error") {
                    category = TranslationCategories.ERROR;
                } else if (v1Translation.category === "success") {
                    category = TranslationCategories.SUCCESS;
                } else if (v1Translation.category === "validation") {
                    category = TranslationCategories.VALIDATION;
                }

                // Migrate each locale
                for (const [oldLocale, newLocale] of Object.entries(localeMap)) {
                    const translations = v1Translation.translations as { vi: string; en: string; ja: string };
                    const translationValue = translations[oldLocale as keyof typeof translations];
                    
                    if (!translationValue || translationValue.trim() === "") {
                        continue;
                    }

                    const v2Key = buildTranslationKey(baseKey, newLocale);
                    
                    // Check if already exists
                    const existing = await TranslationV2.findOne({ key: v2Key });
                    if (existing) {
                        logger.warn(`Translation ${v2Key} already exists, skipping`);
                        skipped++;
                        continue;
                    }

                    // Create V2 translation
                    await TranslationV2.create({
                        key: v2Key,
                        baseKey,
                        locale: newLocale,
                        category,
                        value: translationValue,
                        description: v1Translation.description,
                        isActive: true,
                        createdBy: migrationUserId,
                        updatedBy: migrationUserId
                    });

                    migrated++;
                }
            } catch (error: any) {
                logger.error(`Error migrating translation ${v1Translation.key}:`, error);
                errors++;
            }
        }

        logger.info(`Migration completed:`);
        logger.info(`  - Migrated: ${migrated}`);
        logger.info(`  - Skipped: ${skipped}`);
        logger.info(`  - Errors: ${errors}`);

        await mongoose.disconnect();
        logger.info("Disconnected from MongoDB");
    } catch (error) {
        logger.error("Migration failed:", error);
        process.exit(1);
    }
}

/**
 * Import translations from JSON format (like the example provided)
 */
async function importTranslationsFromJSON(translations: Record<string, string>) {
    try {
        await mongoose.connect(config.database.uri);
        logger.info("Connected to MongoDB");

        const migrationUserId = new mongoose.Types.ObjectId();
        let imported = 0;
        let errors = 0;

        for (const [key, value] of Object.entries(translations)) {
            try {
                // Parse key to get baseKey, locale, variant
                const { parseTranslationKey } = require("../utils/translationKeyParser");
                const parsed = parseTranslationKey(key);

                if (!parsed.locale) {
                    logger.warn(`Key ${key} has no locale, skipping`);
                    continue;
                }

                // Determine category from key prefix
                let category = TranslationCategories.UI;
                if (key.startsWith("Label_")) {
                    category = TranslationCategories.SELLING_POINT;
                } else if (key.startsWith("Msg_")) {
                    category = TranslationCategories.MESSAGE;
                } else if (key.startsWith("Error_")) {
                    category = TranslationCategories.ERROR;
                } else if (key.startsWith("Success_")) {
                    category = TranslationCategories.SUCCESS;
                }

                // Upsert translation
                await TranslationV2.findOneAndUpdate(
                    { key },
                    {
                        key,
                        baseKey: parsed.baseKey,
                        locale: parsed.locale,
                        variant: parsed.variant,
                        category,
                        value,
                        isActive: true,
                        updatedBy: migrationUserId,
                        $setOnInsert: {
                            createdBy: migrationUserId
                        }
                    },
                    {
                        upsert: true,
                        new: true,
                        setDefaultsOnInsert: true
                    }
                );

                imported++;
            } catch (error: any) {
                logger.error(`Error importing translation ${key}:`, error);
                errors++;
            }
        }

        logger.info(`Import completed:`);
        logger.info(`  - Imported: ${imported}`);
        logger.info(`  - Errors: ${errors}`);

        await mongoose.disconnect();
        logger.info("Disconnected from MongoDB");
    } catch (error) {
        logger.error("Import failed:", error);
        process.exit(1);
    }
}

// Run migration if called directly
if (require.main === module) {
    const args = process.argv.slice(2);
    
    if (args[0] === "migrate") {
        migrateTranslationsV1ToV2();
    } else if (args[0] === "import" && args[1]) {
        // Import from JSON file
        const translations = require(args[1]);
        importTranslationsFromJSON(translations);
    } else {
        console.log("Usage:");
        console.log("  npm run migrate-translations-v2 migrate");
        console.log("  npm run migrate-translations-v2 import <json-file>");
    }
}

export { migrateTranslationsV1ToV2, importTranslationsFromJSON };


"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.migrateTranslationsV1ToV2 = migrateTranslationsV1ToV2;
exports.importTranslationsFromJSON = importTranslationsFromJSON;
const mongoose_1 = __importDefault(require("mongoose"));
const Translation_1 = require("../models/Translation");
const TranslationV2_1 = require("../models/TranslationV2");
const translationKeyParser_1 = require("../utils/translationKeyParser");
const config_1 = require("../config/config");
const logger_1 = require("../utils/logger");
/**
 * Migration script to convert V1 translations to V2 format
 *
 * V1: { key: "nav.home", translations: { vi: "...", en: "...", ja: "..." } }
 * V2: { key: "Label_nav_home_vn", baseKey: "Label_nav_home", locale: "vn", value: "..." }
 */
async function migrateTranslationsV1ToV2() {
    try {
        // Connect to database
        await mongoose_1.default.connect(config_1.config.database.uri);
        logger_1.logger.info("Connected to MongoDB");
        // Get all V1 translations
        const v1Translations = await Translation_1.Translation.find({ isActive: true }).lean();
        logger_1.logger.info(`Found ${v1Translations.length} V1 translations to migrate`);
        const localeMap = {
            vi: TranslationV2_1.SupportedLocales.VIETNAMESE,
            en: TranslationV2_1.SupportedLocales.ENGLISH,
            ja: TranslationV2_1.SupportedLocales.JAPANESE
        };
        let migrated = 0;
        let skipped = 0;
        let errors = 0;
        // Create a dummy user ID for migration
        const migrationUserId = new mongoose_1.default.Types.ObjectId();
        for (const v1Translation of v1Translations) {
            try {
                // Convert nested key to flat key with prefix
                // "nav.home" -> "Label_nav_home"
                const baseKey = `Label_${v1Translation.key.replace(/\./g, "_")}`;
                // Determine category
                let category = TranslationV2_1.TranslationCategories.UI;
                if (v1Translation.category === "error") {
                    category = TranslationV2_1.TranslationCategories.ERROR;
                }
                else if (v1Translation.category === "success") {
                    category = TranslationV2_1.TranslationCategories.SUCCESS;
                }
                else if (v1Translation.category === "validation") {
                    category = TranslationV2_1.TranslationCategories.VALIDATION;
                }
                // Migrate each locale
                for (const [oldLocale, newLocale] of Object.entries(localeMap)) {
                    const translations = v1Translation.translations;
                    const translationValue = translations[oldLocale];
                    if (!translationValue || translationValue.trim() === "") {
                        continue;
                    }
                    const v2Key = (0, translationKeyParser_1.buildTranslationKey)(baseKey, newLocale);
                    // Check if already exists
                    const existing = await TranslationV2_1.TranslationV2.findOne({ key: v2Key });
                    if (existing) {
                        logger_1.logger.warn(`Translation ${v2Key} already exists, skipping`);
                        skipped++;
                        continue;
                    }
                    // Create V2 translation
                    await TranslationV2_1.TranslationV2.create({
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
            }
            catch (error) {
                logger_1.logger.error(`Error migrating translation ${v1Translation.key}:`, error);
                errors++;
            }
        }
        logger_1.logger.info(`Migration completed:`);
        logger_1.logger.info(`  - Migrated: ${migrated}`);
        logger_1.logger.info(`  - Skipped: ${skipped}`);
        logger_1.logger.info(`  - Errors: ${errors}`);
        await mongoose_1.default.disconnect();
        logger_1.logger.info("Disconnected from MongoDB");
    }
    catch (error) {
        logger_1.logger.error("Migration failed:", error);
        process.exit(1);
    }
}
/**
 * Import translations from JSON format (like the example provided)
 */
async function importTranslationsFromJSON(translations) {
    try {
        await mongoose_1.default.connect(config_1.config.database.uri);
        logger_1.logger.info("Connected to MongoDB");
        const migrationUserId = new mongoose_1.default.Types.ObjectId();
        let imported = 0;
        let errors = 0;
        for (const [key, value] of Object.entries(translations)) {
            try {
                // Parse key to get baseKey, locale, variant
                const { parseTranslationKey } = require("../utils/translationKeyParser");
                const parsed = parseTranslationKey(key);
                if (!parsed.locale) {
                    logger_1.logger.warn(`Key ${key} has no locale, skipping`);
                    continue;
                }
                // Determine category from key prefix
                let category = TranslationV2_1.TranslationCategories.UI;
                if (key.startsWith("Label_")) {
                    category = TranslationV2_1.TranslationCategories.SELLING_POINT;
                }
                else if (key.startsWith("Msg_")) {
                    category = TranslationV2_1.TranslationCategories.MESSAGE;
                }
                else if (key.startsWith("Error_")) {
                    category = TranslationV2_1.TranslationCategories.ERROR;
                }
                else if (key.startsWith("Success_")) {
                    category = TranslationV2_1.TranslationCategories.SUCCESS;
                }
                // Upsert translation
                await TranslationV2_1.TranslationV2.findOneAndUpdate({ key }, {
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
                }, {
                    upsert: true,
                    new: true,
                    setDefaultsOnInsert: true
                });
                imported++;
            }
            catch (error) {
                logger_1.logger.error(`Error importing translation ${key}:`, error);
                errors++;
            }
        }
        logger_1.logger.info(`Import completed:`);
        logger_1.logger.info(`  - Imported: ${imported}`);
        logger_1.logger.info(`  - Errors: ${errors}`);
        await mongoose_1.default.disconnect();
        logger_1.logger.info("Disconnected from MongoDB");
    }
    catch (error) {
        logger_1.logger.error("Import failed:", error);
        process.exit(1);
    }
}
// Run migration if called directly
if (require.main === module) {
    const args = process.argv.slice(2);
    if (args[0] === "migrate") {
        migrateTranslationsV1ToV2();
    }
    else if (args[0] === "import" && args[1]) {
        // Import from JSON file
        const translations = require(args[1]);
        importTranslationsFromJSON(translations);
    }
    else {
        console.log("Usage:");
        console.log("  npm run migrate-translations-v2 migrate");
        console.log("  npm run migrate-translations-v2 import <json-file>");
    }
}

import mongoose, { Document, Schema } from "mongoose";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { config } from "../config/config";
import { CacheWrapper, QueryAnalyzer } from "../utils/performance";
import { logger } from "../utils/logger";

// Create optimized cache instances
const userCache = new CacheWrapper("user", 1800); // 30 minutes
const userQueryCache = new CacheWrapper("user_query", 600); // 10 minutes

export interface IUser extends Document {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    phone?: string;
    avatar?: string;
    role: "customer" | "admin" | "seller";
    isActive: boolean;
    isEmailVerified: boolean;
    emailVerificationToken?: string;
    passwordResetToken?: string;
    passwordResetExpires?: Date;
    lastLogin?: Date;
    addresses: mongoose.Types.DocumentArray<{
        _id?: mongoose.Types.ObjectId;
        type: "home" | "work" | "other";
        street: string;
        city: string;
        state: string;
        zipCode: string;
        country: string;
        isDefault: boolean;
    }>;
    preferences: {
        language: string;
        currency: string;
        notifications: {
            email: boolean;
            sms: boolean;
            push: boolean;
        };
    };
    createdAt: Date;
    updatedAt: Date;

    // Methods
    matchPassword(enteredPassword: string): Promise<boolean>;
    getSignedJwtToken(): string;
    getRefreshToken(): string;
    generateEmailVerificationToken(): string;
    generatePasswordResetToken(): string;

    // Cache methods
    cacheUser(): Promise<void>;
    invalidateCache(): Promise<void>;

    // Computed properties
    fullName: string;
}

const AddressSchema = new Schema({
    type: {
        type: String,
        enum: ["home", "work", "other"],
        default: "home"
    },
    street: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    zipCode: { type: String, required: true },
    country: { type: String, required: true },
    isDefault: { type: Boolean, default: false }
});

const UserSchema = new Schema<IUser>(
    {
        firstName: {
            type: String,
            required: [true, "Please add a first name"],
            trim: true,
            maxlength: [50, "First name cannot be more than 50 characters"],
            // Ensure proper UTF-8 encoding for Vietnamese characters
            set: function (value: string) {
                if (typeof value === "string") {
                    // Normalize Vietnamese characters
                    return value.normalize("NFC");
                }
                return value;
            }
        },
        lastName: {
            type: String,
            required: [true, "Please add a last name"],
            trim: true,
            maxlength: [50, "Last name cannot be more than 50 characters"],
            // Ensure proper UTF-8 encoding for Vietnamese characters
            set: function (value: string) {
                if (typeof value === "string") {
                    // Normalize Vietnamese characters
                    return value.normalize("NFC");
                }
                return value;
            }
        },
        email: {
            type: String,
            required: [true, "Please add an email"],
            unique: true,
            lowercase: true,
            match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, "Please add a valid email"]
        },
        password: {
            type: String,
            required: [true, "Please add a password"],
            minlength: [6, "Password must be at least 6 characters"],
            select: false
        },
        phone: {
            type: String,
            validate: {
                validator: function (value: string) {
                    if (!value) return true; // Optional field

                    // Remove all non-digit characters for validation
                    const digitsOnly = value.replace(/\D/g, "");

                    // Must have 10-15 digits total
                    if (digitsOnly.length < 10 || digitsOnly.length > 15) {
                        return false;
                    }

                    // Allow digits, spaces, dashes, dots, parentheses, plus sign
                    const phoneRegex = /^[\+]?[\d\s\-\(\)\.]+$/;
                    return phoneRegex.test(value);
                },
                message: "Please add a valid phone number"
            }
        },
        avatar: {
            type: String,
            default: null
        },
        role: {
            type: String,
            enum: ["customer", "admin", "seller"],
            default: "customer"
        },
        isActive: {
            type: Boolean,
            default: true
        },
        isEmailVerified: {
            type: Boolean,
            default: true
        },
        emailVerificationToken: String,
        passwordResetToken: String,
        passwordResetExpires: Date,
        lastLogin: Date,
        addresses: [AddressSchema],
        preferences: {
            language: {
                type: String,
                enum: ["vi", "en", "ja"],
                default: "en"
            },
            currency: { type: String, default: "USD" },
            notifications: {
                email: { type: Boolean, default: true },
                sms: { type: Boolean, default: false },
                push: { type: Boolean, default: true }
            }
        }
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
        // Ensure proper UTF-8 encoding for Vietnamese characters
        collation: { locale: "vi", strength: 2 }
    }
);

// Virtual for full name
UserSchema.virtual("fullName").get(function () {
    return `${this.firstName} ${this.lastName}`;
});

// Ensure proper UTF-8 encoding for Vietnamese characters
UserSchema.pre("save", function (next) {
    // Normalize Vietnamese characters in firstName and lastName
    if (this.firstName && typeof this.firstName === "string") {
        this.firstName = this.firstName.normalize("NFC");
    }
    if (this.lastName && typeof this.lastName === "string") {
        this.lastName = this.lastName.normalize("NFC");
    }
    next();
});

// Encrypt password using bcrypt
UserSchema.pre("save", async function (next) {
    if (!this.isModified("password")) {
        next();
    }

    const salt = await bcrypt.genSalt(12); // Increased from 10 to 12 for better security
    this.password = await bcrypt.hash(this.password, salt);
});

// Sign JWT and return
UserSchema.methods.getSignedJwtToken = function () {
    return jwt.sign({ id: this._id.toString() }, config.jwt.secret, {
        expiresIn: config.jwt.expiresIn
    } as any);
};

// Generate refresh token
UserSchema.methods.getRefreshToken = function () {
    return jwt.sign({ id: this._id.toString() }, config.jwt.refreshSecret, {
        expiresIn: config.jwt.refreshExpiresIn
    } as any);
};

// Match user entered password to hashed password in database
UserSchema.methods.matchPassword = async function (enteredPassword: string) {
    return await bcrypt.compare(enteredPassword, this.password);
};

// Generate email verification token
UserSchema.methods.generateEmailVerificationToken = function () {
    const crypto = require("crypto");
    const verificationToken = crypto.randomBytes(32).toString("hex");

    this.emailVerificationToken = verificationToken;
    return verificationToken;
};

// Generate password reset token
UserSchema.methods.generatePasswordResetToken = function () {
    const crypto = require("crypto");
    const resetToken = crypto.randomBytes(32).toString("hex");

    this.passwordResetToken = resetToken;
    this.passwordResetExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    return resetToken;
};

// Cache user data
UserSchema.methods.cacheUser = async function () {
    try {
        const userObj = this.toObject();
        delete userObj.password; // Never cache password
        await userCache.set(this._id.toString(), userObj);
        await userCache.set(`email:${this.email}`, userObj);
        logger.debug(`User cached: ${this._id}`);
    } catch (error) {
        logger.error("Error caching user:", error);
    }
};

// Invalidate user cache
UserSchema.methods.invalidateCache = async function () {
    try {
        await userCache.del(this._id.toString());
        await userCache.del(`email:${this.email}`);
        logger.debug(`User cache invalidated: ${this._id}`);
    } catch (error) {
        logger.error("Error invalidating user cache:", error);
    }
};

// Post-save middleware to cache user
UserSchema.post("save", async function () {
    await this.cacheUser();
});

// Post-remove middleware to invalidate cache
// UserSchema.post("remove", async function () {
//     await this.invalidateCache();
// });

// Post-findOneAndUpdate middleware to invalidate cache
UserSchema.post("findOneAndUpdate", async function (doc) {
    if (doc) {
        await doc.invalidateCache();
        await doc.cacheUser();
    }
});

// Optimized static methods for better performance
UserSchema.statics.findByIdCached = async function (id: string) {
    return QueryAnalyzer.analyzeQuery(`User.findByIdCached:${id}`, async () => {
        // Try cache first
        const cached = await userCache.get(id);
        if (cached) {
            logger.debug(`User cache hit: ${id}`);
            return new this(cached);
        }

        // If not in cache, query database
        const user = await this.findById(id).select("+password");
        if (user) {
            await user.cacheUser();
        }
        return user;
    });
};

// Find user by email for authentication (includes password)
UserSchema.statics.findByEmailForAuth = async function (email: string) {
    return QueryAnalyzer.analyzeQuery(`User.findByEmailForAuth:${email}`, async () => {
        // Always query database for authentication to get password
        const user = await this.findOne({ email }).select("+password");

        if (user) {
            logger.debug(`User auth query: ${email}`);
            // Cache user data (without password) for other operations
            await user.cacheUser();
        }

        return user;
    });
};

// Find user by email (cached, without password) for general operations
UserSchema.statics.findByEmailCached = async function (email: string) {
    return QueryAnalyzer.analyzeQuery(`User.findByEmailCached:${email}`, async () => {
        // Try cache first
        const cached = await userCache.get(`email:${email}`);
        if (cached) {
            logger.debug(`User email cache hit: ${email}`);
            return new this(cached);
        }

        // If not in cache, query database (without password for general use)
        const user = await this.findOne({ email });
        if (user) {
            await user.cacheUser();
        }
        return user;
    });
};

// Optimized bulk operations
UserSchema.statics.findActiveUsers = async function (limit = 100, skip = 0) {
    return QueryAnalyzer.analyzeQuery("User.findActiveUsers", async () => {
        const cacheKey = `active_users:${limit}:${skip}`;

        // Try cache first
        const cached = await userQueryCache.get(cacheKey);
        if (cached) {
            return cached;
        }

        // Query database with optimized projection
        const users = await this.find(
            { isActive: true },
            { password: 0, emailVerificationToken: 0, passwordResetToken: 0 }
        )
            .limit(limit)
            .skip(skip)
            .lean(); // Use lean() for better performance

        // Cache results
        await userQueryCache.set(cacheKey, users, 300); // 5 minutes cache
        return users;
    });
};

// Add compound indexes for better query performance
UserSchema.index({ email: 1 }, { unique: true });
UserSchema.index({ isActive: 1, role: 1 });
UserSchema.index({ createdAt: -1 });
UserSchema.index({ lastLogin: -1 });
UserSchema.index({ "addresses.isDefault": 1 });

export const User = mongoose.model<IUser>("User", UserSchema);

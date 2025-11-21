import { AuthService } from "../../src/services/authService";
import { User } from "../../src/models/User";
import { AppError } from "../../src/utils/AppError";
import jwt from "jsonwebtoken";

describe("AuthService", () => {
    describe("register", () => {
        it("should register a new user successfully", async () => {
            const userData = {
                firstName: "John",
                lastName: "Doe",
                email: "adadad@gmail.com",
                password: "Password123@",
                phone: "+1234567890"
            };

            const result = await AuthService.register(userData);

            expect(result).toHaveProperty("user");
            expect(result).toHaveProperty("token");
            expect(result).toHaveProperty("refreshToken");
            expect(result.user.email).toBe(userData.email);
            expect(result.user.firstName).toBe(userData.firstName);
            expect(result.user).not.toHaveProperty("password");
        });

        it("should throw error if user already exists", async () => {
            const userData = {
                firstName: "John",
                lastName: "Doe",
                email: "duplicate@example.com",
                password: "SecurePassword123!"
            };

            // Create user first time
            await AuthService.register(userData);

            // Try to create same user again
            await expect(AuthService.register(userData)).rejects.toThrow("User already exists with this email");
        });

        it("should hash password before saving", async () => {
            const userData = {
                firstName: "John",
                lastName: "Doe",
                email: global.testUtils.generateRandomEmail(),
                password: "PlainTextPassword123!"
            };

            await AuthService.register(userData);

            const user = await User.findOne({ email: userData.email }).select("+password");
            expect(user?.password).not.toBe(userData.password);
            expect(user?.password).toMatch(/^\$2[aby]\$\d+\$/); // bcrypt hash pattern
        });

        it("should set default values correctly", async () => {
            const userData = {
                firstName: "John",
                lastName: "Doe",
                email: global.testUtils.generateRandomEmail(),
                password: "SecurePassword123!"
            };

            const result = await AuthService.register(userData);

            expect(result.user.isActive).toBe(true);
            expect(result.user.isEmailVerified).toBe(true);
            expect(result.user.role).toBe("customer");
        });
    });

    describe("login", () => {
        let testUser: any;

        beforeEach(async () => {
            const userData = {
                firstName: "Test",
                lastName: "User",
                email: global.testUtils.generateRandomEmail(),
                password: "TestPassword123!"
            };

            testUser = await AuthService.register(userData);
        });

        it("should login with valid credentials", async () => {
            const loginData = {
                email: testUser.user.email,
                password: "TestPassword123!"
            };

            const result = await AuthService.login(loginData);

            expect(result).toHaveProperty("user");
            expect(result).toHaveProperty("token");
            expect(result).toHaveProperty("refreshToken");
            expect(result.user.email).toBe(loginData.email);
        });

        it("should throw error with invalid email", async () => {
            const loginData = {
                email: "nonexistent@example.com",
                password: "TestPassword123!"
            };

            await expect(AuthService.login(loginData)).rejects.toThrow("Invalid credentials");
        });

        it("should throw error with invalid password", async () => {
            const loginData = {
                email: testUser.user.email,
                password: "WrongPassword123!"
            };

            await expect(AuthService.login(loginData)).rejects.toThrow("Invalid credentials");
        });

        it("should throw error for inactive user", async () => {
            // Deactivate user
            await User.findByIdAndUpdate(testUser.user._id, { isActive: false });

            const loginData = {
                email: testUser.user.email,
                password: "TestPassword123!"
            };

            await expect(AuthService.login(loginData)).rejects.toThrow("Account is deactivated");
        });

        it("should implement rate limiting for failed attempts", async () => {
            const loginData = {
                email: testUser.user.email,
                password: "WrongPassword123!"
            };

            // Make 5 failed attempts
            for (let i = 0; i < 5; i++) {
                try {
                    await AuthService.login(loginData);
                } catch (error) {
                    // Expected to fail
                }
            }

            // 6th attempt should be rate limited
            await expect(AuthService.login(loginData)).rejects.toThrow("Too many login attempts");
        });
    });

    describe("refreshToken", () => {
        let testUser: any;

        beforeEach(async () => {
            const userData = {
                firstName: "Test",
                lastName: "User",
                email: global.testUtils.generateRandomEmail(),
                password: "TestPassword123!"
            };

            testUser = await AuthService.register(userData);
        });

        it("should refresh token with valid refresh token", async () => {
            const result = await AuthService.refreshToken(testUser.refreshToken);

            expect(result).toHaveProperty("token");
            expect(result).toHaveProperty("refreshToken");
            expect(result.token).not.toBe(testUser.token);
            expect(result.refreshToken).not.toBe(testUser.refreshToken);
        });

        it("should throw error with invalid refresh token", async () => {
            const invalidToken = "invalid.refresh.token";

            await expect(AuthService.refreshToken(invalidToken)).rejects.toThrow("Invalid refresh token");
        });

        it("should blacklist old refresh token", async () => {
            const oldRefreshToken = testUser.refreshToken;

            // Use refresh token once
            await AuthService.refreshToken(oldRefreshToken);

            // Try to use the same token again
            await expect(AuthService.refreshToken(oldRefreshToken)).rejects.toThrow("Token has been revoked");
        });

        it("should throw error for inactive user", async () => {
            // Deactivate user
            await User.findByIdAndUpdate(testUser.user._id, { isActive: false });

            await expect(AuthService.refreshToken(testUser.refreshToken)).rejects.toThrow("Invalid refresh token");
        });
    });

    describe("getUserById", () => {
        let testUser: any;

        beforeEach(async () => {
            const userData = {
                firstName: "Test",
                lastName: "User",
                email: global.testUtils.generateRandomEmail(),
                password: "TestPassword123!"
            };

            testUser = await AuthService.register(userData);
        });

        it("should get user by valid ID", async () => {
            const user = await AuthService.getUserById(testUser.user._id);

            expect(user).toBeTruthy();
            expect(user?.email).toBe(testUser.user.email);
            expect(user).not.toHaveProperty("password");
        });

        it("should return null for invalid ID", async () => {
            const invalidId = "507f1f77bcf86cd799439011";
            const user = await AuthService.getUserById(invalidId);

            expect(user).toBeNull();
        });

        it("should return null for inactive user", async () => {
            // Deactivate user
            await User.findByIdAndUpdate(testUser.user._id, { isActive: false });

            const user = await AuthService.getUserById(testUser.user._id);
            expect(user).toBeNull();
        });
    });

    describe("changePassword", () => {
        let testUser: any;

        beforeEach(async () => {
            const userData = {
                firstName: "Test",
                lastName: "User",
                email: global.testUtils.generateRandomEmail(),
                password: "OldPassword123!"
            };

            testUser = await AuthService.register(userData);
        });

        it("should change password with valid current password", async () => {
            await expect(
                AuthService.changePassword(testUser.user._id, "OldPassword123!", "NewPassword123!")
            ).resolves.not.toThrow();

            // Verify new password works
            const loginResult = await AuthService.login({
                email: testUser.user.email,
                password: "NewPassword123!"
            });

            expect(loginResult).toHaveProperty("token");
        });

        it("should throw error with invalid current password", async () => {
            await expect(
                AuthService.changePassword(testUser.user._id, "WrongPassword123!", "NewPassword123!")
            ).rejects.toThrow("Current password is incorrect");
        });

        it("should throw error for non-existent user", async () => {
            const invalidId = "507f1f77bcf86cd799439011";

            await expect(AuthService.changePassword(invalidId, "OldPassword123!", "NewPassword123!")).rejects.toThrow(
                "User not found"
            );
        });
    });

    describe("forgotPassword", () => {
        let testUser: any;

        beforeEach(async () => {
            const userData = {
                firstName: "Test",
                lastName: "User",
                email: global.testUtils.generateRandomEmail(),
                password: "TestPassword123!"
            };

            testUser = await AuthService.register(userData);
        });

        it("should generate reset token for valid email", async () => {
            const resetToken = await AuthService.forgotPassword(testUser.user.email);

            expect(resetToken).toBeTruthy();
            expect(typeof resetToken).toBe("string");
            expect(resetToken.length).toBeGreaterThan(0);
        });

        it("should throw error for non-existent email", async () => {
            await expect(AuthService.forgotPassword("nonexistent@example.com")).rejects.toThrow("User not found");
        });
    });

    describe("resetPassword", () => {
        let testUser: any;
        let resetToken: string;

        beforeEach(async () => {
            const userData = {
                firstName: "Test",
                lastName: "User",
                email: global.testUtils.generateRandomEmail(),
                password: "OldPassword123!"
            };

            testUser = await AuthService.register(userData);
            resetToken = await AuthService.forgotPassword(testUser.user.email);
        });

        it("should reset password with valid token", async () => {
            const result = await AuthService.resetPassword(resetToken, "NewPassword123!");

            expect(result).toHaveProperty("user");
            expect(result).toHaveProperty("token");
            expect(result).toHaveProperty("refreshToken");

            // Verify new password works
            const loginResult = await AuthService.login({
                email: testUser.user.email,
                password: "NewPassword123!"
            });

            expect(loginResult).toHaveProperty("token");
        });

        it("should throw error with invalid token", async () => {
            await expect(AuthService.resetPassword("invalid-token", "NewPassword123!")).rejects.toThrow(
                "Invalid or expired reset token"
            );
        });

        it("should throw error with expired token", async () => {
            // Manually expire the token
            await User.findByIdAndUpdate(testUser.user._id, {
                passwordResetExpires: new Date(Date.now() - 1000) // 1 second ago
            });

            await expect(AuthService.resetPassword(resetToken, "NewPassword123!")).rejects.toThrow(
                "Invalid or expired reset token"
            );
        });
    });
});

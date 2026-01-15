import { describe, it, expect } from "vitest";
import { loginSchema, registerSchema, forgotPasswordSchema, resetPasswordSchema } from "@/lib/schemas/auth";

describe("loginSchema", () => {
  it("should validate correct login data", () => {
    const validData = {
      email: "test@example.com",
      password: "password123",
    };

    expect(() => loginSchema.parse(validData)).not.toThrow();
  });

  it("should reject invalid email format", () => {
    const invalidData = {
      email: "not-an-email",
      password: "password123",
    };

    expect(() => loginSchema.parse(invalidData)).toThrow("Podaj poprawny adres email");
  });

  it("should reject email without @ symbol", () => {
    const invalidData = {
      email: "testexample.com",
      password: "password123",
    };

    expect(() => loginSchema.parse(invalidData)).toThrow("Podaj poprawny adres email");
  });

  it("should reject email without domain", () => {
    const invalidData = {
      email: "test@",
      password: "password123",
    };

    expect(() => loginSchema.parse(invalidData)).toThrow();
  });

  it("should reject empty password", () => {
    const invalidData = {
      email: "test@example.com",
      password: "",
    };

    expect(() => loginSchema.parse(invalidData)).toThrow("Hasło jest wymagane");
  });

  it("should accept any non-empty password (no strength requirement on login)", () => {
    const validData = {
      email: "test@example.com",
      password: "weak",
    };

    expect(() => loginSchema.parse(validData)).not.toThrow();
  });
});

describe("registerSchema", () => {
  it("should validate correct registration data", () => {
    const validData = {
      email: "test@example.com",
      password: "Password123",
      confirmPassword: "Password123",
    };

    expect(() => registerSchema.parse(validData)).not.toThrow();
  });

  it("should reject password shorter than 8 characters", () => {
    const invalidData = {
      email: "test@example.com",
      password: "Pass1",
      confirmPassword: "Pass1",
    };

    expect(() => registerSchema.parse(invalidData)).toThrow("Hasło musi mieć minimum 8 znaków");
  });

  it("should accept password at exactly 8 characters", () => {
    const validData = {
      email: "test@example.com",
      password: "Pass1234",
      confirmPassword: "Pass1234",
    };

    expect(() => registerSchema.parse(validData)).not.toThrow();
  });

  it("should reject password without uppercase letter", () => {
    const invalidData = {
      email: "test@example.com",
      password: "password123",
      confirmPassword: "password123",
    };

    expect(() => registerSchema.parse(invalidData)).toThrow("Hasło musi zawierać przynajmniej jedną wielką literę");
  });

  it("should reject password without lowercase letter", () => {
    const invalidData = {
      email: "test@example.com",
      password: "PASSWORD123",
      confirmPassword: "PASSWORD123",
    };

    expect(() => registerSchema.parse(invalidData)).toThrow("Hasło musi zawierać przynajmniej jedną małą literę");
  });

  it("should reject password without digit", () => {
    const invalidData = {
      email: "test@example.com",
      password: "Password",
      confirmPassword: "Password",
    };

    expect(() => registerSchema.parse(invalidData)).toThrow("Hasło musi zawierać przynajmniej jedną cyfrę");
  });

  it("should reject when passwords do not match", () => {
    const invalidData = {
      email: "test@example.com",
      password: "Password123",
      confirmPassword: "Password456",
    };

    expect(() => registerSchema.parse(invalidData)).toThrow("Hasła nie są identyczne");
  });

  it("should reject empty confirmPassword", () => {
    const invalidData = {
      email: "test@example.com",
      password: "Password123",
      confirmPassword: "",
    };

    expect(() => registerSchema.parse(invalidData)).toThrow("Potwierdzenie hasła jest wymagane");
  });

  it("should accept complex password meeting all requirements", () => {
    const validData = {
      email: "test@example.com",
      password: "Str0ng!P@ssw0rd",
      confirmPassword: "Str0ng!P@ssw0rd",
    };

    expect(() => registerSchema.parse(validData)).not.toThrow();
  });

  it("should reject invalid email format", () => {
    const invalidData = {
      email: "invalid-email",
      password: "Password123",
      confirmPassword: "Password123",
    };

    expect(() => registerSchema.parse(invalidData)).toThrow("Podaj poprawny adres email");
  });
});

describe("forgotPasswordSchema", () => {
  it("should validate correct email", () => {
    const validData = {
      email: "test@example.com",
    };

    expect(() => forgotPasswordSchema.parse(validData)).not.toThrow();
  });

  it("should reject invalid email format", () => {
    const invalidData = {
      email: "not-an-email",
    };

    expect(() => forgotPasswordSchema.parse(invalidData)).toThrow("Podaj poprawny adres email");
  });

  it("should reject empty email", () => {
    const invalidData = {
      email: "",
    };

    expect(() => forgotPasswordSchema.parse(invalidData)).toThrow();
  });

  it("should accept email with subdomain", () => {
    const validData = {
      email: "test@mail.example.com",
    };

    expect(() => forgotPasswordSchema.parse(validData)).not.toThrow();
  });

  it("should accept email with plus sign", () => {
    const validData = {
      email: "test+tag@example.com",
    };

    expect(() => forgotPasswordSchema.parse(validData)).not.toThrow();
  });
});

describe("resetPasswordSchema", () => {
  it("should validate correct reset password data", () => {
    const validData = {
      password: "NewPass123",
      confirmPassword: "NewPass123",
    };

    expect(() => resetPasswordSchema.parse(validData)).not.toThrow();
  });

  it("should reject password shorter than 8 characters", () => {
    const invalidData = {
      password: "New1",
      confirmPassword: "New1",
    };

    expect(() => resetPasswordSchema.parse(invalidData)).toThrow("Hasło musi mieć minimum 8 znaków");
  });

  it("should reject password without uppercase letter", () => {
    const invalidData = {
      password: "newpass123",
      confirmPassword: "newpass123",
    };

    expect(() => resetPasswordSchema.parse(invalidData)).toThrow(
      "Hasło musi zawierać przynajmniej jedną wielką literę"
    );
  });

  it("should reject password without lowercase letter", () => {
    const invalidData = {
      password: "NEWPASS123",
      confirmPassword: "NEWPASS123",
    };

    expect(() => resetPasswordSchema.parse(invalidData)).toThrow("Hasło musi zawierać przynajmniej jedną małą literę");
  });

  it("should reject password without digit", () => {
    const invalidData = {
      password: "NewPassword",
      confirmPassword: "NewPassword",
    };

    expect(() => resetPasswordSchema.parse(invalidData)).toThrow("Hasło musi zawierać przynajmniej jedną cyfrę");
  });

  it("should reject when passwords do not match", () => {
    const invalidData = {
      password: "NewPass123",
      confirmPassword: "NewPass456",
    };

    expect(() => resetPasswordSchema.parse(invalidData)).toThrow("Hasła nie są identyczne");
  });

  it("should reject empty confirmPassword", () => {
    const invalidData = {
      password: "NewPass123",
      confirmPassword: "",
    };

    expect(() => resetPasswordSchema.parse(invalidData)).toThrow("Potwierdzenie hasła jest wymagane");
  });

  it("should accept strong password meeting all requirements", () => {
    const validData = {
      password: "VeryStr0ng!Pass",
      confirmPassword: "VeryStr0ng!Pass",
    };

    expect(() => resetPasswordSchema.parse(validData)).not.toThrow();
  });

  it("should allow special characters in password", () => {
    const validData = {
      password: "P@ssw0rd!#$",
      confirmPassword: "P@ssw0rd!#$",
    };

    expect(() => resetPasswordSchema.parse(validData)).not.toThrow();
  });
});

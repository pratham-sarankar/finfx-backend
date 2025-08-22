import express from "express";
import { auth } from "../middleware/auth";
import {
  submitBasicDetails,
  submitRiskProfiling,
  submitCapitalManagement,
  submitExperience,
  getKYCStatus,
} from "../controllers/kycController";
import validate from "../middleware/validate";
import { body } from "express-validator";

const router = express.Router();

// KYC routes
router.post(
  "/basic-details", 
  auth, 
  body("fullName")
    .notEmpty()
    .withMessage("Full name is required")
    .matches(/^[a-zA-Z\s.'-]{2,50}$/)
    .withMessage("Full name should be 2-50 characters and contain only letters, spaces, and common name characters"),
  body("dob")
    .notEmpty()
    .withMessage("Date of birth is required")
    .isISO8601()
    .withMessage("Date of birth must be a valid date")
    .custom((value) => {
      const date = new Date(value);
      const today = new Date();
      const age = today.getFullYear() - date.getFullYear();
      const monthDiff = today.getMonth() - date.getMonth();
      
      if (!(age > 18 || (age === 18 && monthDiff >= 0 && today.getDate() >= date.getDate()))) {
        throw new Error("You must be at least 18 years old");
      }
      return true;
    }),
  body("gender")
    .notEmpty()
    .withMessage("Gender is required")
    .isIn(["male", "female", "other"])
    .withMessage("Gender must be one of: male, female, other"),
  body("pan")
    .notEmpty()
    .withMessage("PAN is required")
    .matches(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/)
    .withMessage("PAN format should be: ABCDE1234F (5 letters, 4 numbers, 1 letter)"),
  body("aadharNumber")
    .notEmpty()
    .withMessage("Aadhar number is required")
    .matches(/^\d{12}$/)
    .withMessage("Aadhar number must be exactly 12 digits"),
  validate,
  submitBasicDetails
);
router.post(
  "/risk-profiling", 
  auth, 
  body("questionsAndAnswers")
    .isArray({ min: 1 })
    .withMessage("Questions and answers must be a non-empty array"),
  body("questionsAndAnswers.*.question")
    .notEmpty()
    .withMessage("Each question must be a non-empty string")
    .isString()
    .withMessage("Each question must be a string"),
  body("questionsAndAnswers.*.answer")
    .notEmpty()
    .withMessage("Each answer must be a non-empty string")
    .isString()
    .withMessage("Each answer must be a string"),
  validate,
  submitRiskProfiling
);
router.post(
  "/capital-management", 
  auth, 
  body("totalCapital")
    .notEmpty()
    .withMessage("Total capital is required")
    .isFloat({ min: 0 })
    .withMessage("Total capital must be a positive number"),
  body("riskPercentage")
    .notEmpty()
    .withMessage("Risk percentage is required")
    .isFloat({ min: 0, max: 100 })
    .withMessage("Risk percentage must be between 0 and 100"),
  body("investmentGoals")
    .optional()
    .isString()
    .withMessage("Investment goals must be a string"),
  validate,
  submitCapitalManagement
);
router.post(
  "/experience", 
  auth, 
  body("tradingExperience")
    .notEmpty()
    .withMessage("Trading experience is required")
    .isIn(["beginner", "intermediate", "advanced", "expert"])
    .withMessage("Trading experience must be one of: beginner, intermediate, advanced, expert"),
  body("previousExperience")
    .optional()
    .isString()
    .withMessage("Previous experience must be a string"),
  body("educationalBackground")
    .optional()
    .isString()
    .withMessage("Educational background must be a string"),
  validate,
  submitExperience
);
router.get("/status", auth, getKYCStatus);

export default router;

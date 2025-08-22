/**
 * KYC Controller
 * Handles KYC (Know Your Customer) operations
 */
import { Request, Response, NextFunction } from "express";
import { AppError } from "../middleware/errorHandler";
import KYC from "../models/KYC";

// Validation helper functions
export const validateFullName = (name: string): boolean => {
  // Name should be 2-50 characters, only letters, spaces, and common name characters
  const nameRegex = /^[a-zA-Z\s.'-]{2,50}$/;
  return nameRegex.test(name);
};

export const validateDOB = (dob: string): boolean => {
  const date = new Date(dob);
  const today = new Date();
  const age = today.getFullYear() - date.getFullYear();
  const monthDiff = today.getMonth() - date.getMonth();

  // Check if date is valid and person is at least 18 years old
  return (
    !isNaN(date.getTime()) && // Valid date
    date < today && // Not future date
    (age > 18 ||
      (age === 18 && monthDiff >= 0 && today.getDate() >= date.getDate())) // At least 18 years old
  );
};

export const validateGender = (gender: string): boolean => {
  const validGenders = ["male", "female", "other"];
  return validGenders.includes(gender.toLowerCase());
};

export const validatePAN = (pan: string): boolean => {
  // PAN format: ABCDE1234F (5 letters, 4 numbers, 1 letter)
  const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
  return panRegex.test(pan.toUpperCase());
};

export const validateAadhar = (aadhar: string): boolean => {
  // Aadhar should be 12 digits
  const aadharRegex = /^\d{12}$/;
  return aadharRegex.test(aadhar);
};

/**
 * Submit basic KYC details
 * @route POST /api/kyc/basic-details
 */
export const submitBasicDetails = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { fullName, dob, gender, pan, aadharNumber } = req.body;

    // Validate required fields
    if (!fullName || !dob || !gender || !pan || !aadharNumber) {
      throw new AppError(
        "Please provide all required fields",
        400,
        "missing-required-fields"
      );
    }

    // Validate each field
    if (!validateFullName(fullName)) {
      throw new AppError(
        "Invalid full name format. Name should be 2-50 characters and contain only letters, spaces, and common name characters",
        400,
        "invalid-full-name"
      );
    }

    if (!validateDOB(dob)) {
      throw new AppError(
        "Invalid date of birth. You must be at least 18 years old",
        400,
        "invalid-dob"
      );
    }

    if (!validateGender(gender)) {
      throw new AppError(
        "Invalid gender. Must be one of: male, female, other",
        400,
        "invalid-gender"
      );
    }

    if (!validatePAN(pan)) {
      throw new AppError(
        "Invalid PAN format. Should be in format: ABCDE1234F",
        400,
        "invalid-pan"
      );
    }

    if (!validateAadhar(aadharNumber)) {
      throw new AppError(
        "Invalid Aadhar number. Must be 12 digits",
        400,
        "invalid-aadhar"
      );
    }

    // Check if PAN or Aadhar is used by other users
    const existingPanOrAadhar = await KYC.findOne({
      userId: { $ne: req.user._id }, // Exclude current user
      $or: [
        { "basicDetails.pan": pan.toUpperCase() },
        { "basicDetails.aadharNumber": aadharNumber },
      ],
    });

    if (existingPanOrAadhar) {
      throw new AppError(
        "PAN or Aadhar number already registered by another user",
        409,
        "duplicate-kyc-details"
      );
    }

    // Find existing KYC or create new one
    const existingKYC = await KYC.findOne({ userId: req.user._id });
    let kyc;

    if (existingKYC) {
      // Update existing KYC
      kyc = await KYC.findOneAndUpdate(
        { userId: req.user._id },
        {
          $set: {
            "basicDetails.fullName": fullName,
            "basicDetails.dob": new Date(dob),
            "basicDetails.gender": gender,
            "basicDetails.pan": pan.toUpperCase(),
            "basicDetails.aadharNumber": aadharNumber,
            "basicDetails.isVerified": false,
            "basicDetails.verificationStatus": "pending",
            status: "in_progress",
          },
        },
        { new: true, runValidators: true }
      );
    } else {
      // Create new KYC record
      kyc = await KYC.create({
        userId: req.user._id,
        basicDetails: {
          fullName,
          dob: new Date(dob),
          gender,
          pan: pan.toUpperCase(),
          aadharNumber,
          isVerified: false,
          verificationStatus: "pending",
        },
        status: "in_progress",
      });
    }

    if (!kyc) {
      throw new AppError(
        "Failed to create or update KYC details",
        500,
        "kyc-operation-failed"
      );
    }

    res.status(201).json({
      status: "success",
      message: existingKYC
        ? "KYC basic details updated successfully"
        : "KYC basic details submitted successfully",
      data: {
        kycId: kyc._id,
        status: kyc.status,
        basicDetails: {
          fullName: kyc.basicDetails.fullName,
          verificationStatus: kyc.basicDetails.verificationStatus,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Submit risk profiling questions and answers
 * @route POST /api/kyc/risk-profiling
 */
export const submitRiskProfiling = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { questionsAndAnswers } = req.body;

    // Validate required field
    if (!questionsAndAnswers || !Array.isArray(questionsAndAnswers)) {
      throw new AppError(
        "Please provide questions and answers as an array",
        400,
        "missing-required-fields"
      );
    }

    // Validate each question and answer pair
    for (const qa of questionsAndAnswers) {
      if (
        !qa.question ||
        typeof qa.question !== "string" ||
        qa.question.trim() === ""
      ) {
        throw new AppError(
          "Each question must be a non-empty string",
          400,
          "invalid-question"
        );
      }
      if (
        !qa.answer ||
        typeof qa.answer !== "string" ||
        qa.answer.trim() === ""
      ) {
        throw new AppError(
          "Each answer must be a non-empty string",
          400,
          "invalid-answer"
        );
      }
    }

    // Find existing KYC
    const existingKYC = await KYC.findOne({ userId: req.user._id });
    if (!existingKYC) {
      throw new AppError(
        "Please complete basic KYC details first",
        400,
        "basic-kyc-required"
      );
    }

    // Update KYC with risk profiling data
    const kyc = await KYC.findOneAndUpdate(
      { userId: req.user._id },
      {
        $set: {
          riskProfiling: {
            questionsAndAnswers,
            completedAt: new Date(),
            isVerified: false,
            verificationStatus: "pending",
          },
          status:
            existingKYC.status === "in_progress"
              ? "in_progress"
              : "pending_verification",
        },
      },
      { new: true, runValidators: true }
    );

    if (!kyc) {
      throw new AppError(
        "Failed to update risk profiling details",
        500,
        "risk-profiling-update-failed"
      );
    }

    res.status(200).json({
      status: "success",
      message: "Risk profiling details submitted successfully",
      data: {
        kycId: kyc._id,
        status: kyc.status,
        riskProfiling: {
          completedAt: kyc.riskProfiling?.completedAt,
          verificationStatus: kyc.riskProfiling?.verificationStatus,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Submit capital management questions and answers
 * @route POST /api/kyc/capital-management
 */
export const submitCapitalManagement = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { questionsAndAnswers } = req.body;

    // Validate required field
    if (!questionsAndAnswers || !Array.isArray(questionsAndAnswers)) {
      throw new AppError(
        "Please provide questions and answers as an array",
        400,
        "missing-required-fields"
      );
    }

    // Validate each question and answer pair
    for (const qa of questionsAndAnswers) {
      if (
        !qa.question ||
        typeof qa.question !== "string" ||
        qa.question.trim() === ""
      ) {
        throw new AppError(
          "Each question must be a non-empty string",
          400,
          "invalid-question"
        );
      }
      if (
        !qa.answer ||
        typeof qa.answer !== "string" ||
        qa.answer.trim() === ""
      ) {
        throw new AppError(
          "Each answer must be a non-empty string",
          400,
          "invalid-answer"
        );
      }
    }

    // Find existing KYC
    const existingKYC = await KYC.findOne({ userId: req.user._id });
    if (!existingKYC) {
      throw new AppError(
        "Please complete basic KYC details first",
        400,
        "basic-kyc-required"
      );
    }

    // Check if risk profiling is completed
    if (!existingKYC.riskProfiling) {
      throw new AppError(
        "Please complete risk profiling first",
        400,
        "risk-profiling-required"
      );
    }

    // Update KYC with capital management data
    const kyc = await KYC.findOneAndUpdate(
      { userId: req.user._id },
      {
        $set: {
          capitalManagement: {
            questionsAndAnswers,
            completedAt: new Date(),
            isVerified: false,
            verificationStatus: "pending",
          },
          status:
            existingKYC.status === "in_progress"
              ? "in_progress"
              : "pending_verification",
        },
      },
      { new: true, runValidators: true }
    );

    if (!kyc) {
      throw new AppError(
        "Failed to update capital management details",
        500,
        "capital-management-update-failed"
      );
    }

    res.status(200).json({
      status: "success",
      message: "Capital management details submitted successfully",
      data: {
        kycId: kyc._id,
        status: kyc.status,
        capitalManagement: {
          completedAt: kyc.capitalManagement?.completedAt,
          verificationStatus: kyc.capitalManagement?.verificationStatus,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Submit experience questions and answers
 * @route POST /api/kyc/experience
 */
export const submitExperience = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { questionsAndAnswers } = req.body;

    // Validate required field
    if (!questionsAndAnswers || !Array.isArray(questionsAndAnswers)) {
      throw new AppError(
        "Please provide questions and answers as an array",
        400,
        "missing-required-fields"
      );
    }

    // Validate each question and answer pair
    for (const qa of questionsAndAnswers) {
      if (
        !qa.question ||
        typeof qa.question !== "string" ||
        qa.question.trim() === ""
      ) {
        throw new AppError(
          "Each question must be a non-empty string",
          400,
          "invalid-question"
        );
      }
      if (
        !qa.answer ||
        typeof qa.answer !== "string" ||
        qa.answer.trim() === ""
      ) {
        throw new AppError(
          "Each answer must be a non-empty string",
          400,
          "invalid-answer"
        );
      }
    }

    // Find existing KYC
    const existingKYC = await KYC.findOne({ userId: req.user._id });
    if (!existingKYC) {
      throw new AppError(
        "Please complete basic KYC details first",
        400,
        "basic-kyc-required"
      );
    }

    // Check if capital management is completed
    if (!existingKYC.capitalManagement) {
      throw new AppError(
        "Please complete capital management first",
        400,
        "capital-management-required"
      );
    }

    // Update KYC with experience data
    const kyc = await KYC.findOneAndUpdate(
      { userId: req.user._id },
      {
        $set: {
          experience: {
            questionsAndAnswers,
            completedAt: new Date(),
            isVerified: false,
            verificationStatus: "pending",
          },
          status:
            existingKYC.status === "in_progress"
              ? "in_progress"
              : "pending_verification",
        },
      },
      { new: true, runValidators: true }
    );

    if (!kyc) {
      throw new AppError(
        "Failed to update experience details",
        500,
        "experience-update-failed"
      );
    }

    res.status(200).json({
      status: "success",
      message: "Experience details submitted successfully",
      data: {
        kycId: kyc._id,
        status: kyc.status,
        experience: {
          completedAt: kyc.experience?.completedAt,
          verificationStatus: kyc.experience?.verificationStatus,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get the complete KYC status and details for the authenticated user
 * @route GET /api/kyc/status
 */
export const getKYCStatus = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const kyc = await KYC.findOne({ userId: req.user._id }).select("-__v");

    if (!kyc) {
      throw new AppError(
        "No KYC record found for this user",
        404,
        "kyc-not-found"
      );
    }

    // Transform the document to convert _id to id
    const transformedKyc = {
      ...kyc.toObject(),
      id: kyc._id,
    };
    delete transformedKyc._id;

    res.status(200).json({
      status: "success",
      data: transformedKyc,
    });
  } catch (error) {
    next(error);
  }
};
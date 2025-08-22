import express from "express";
import { auth } from "../middleware/auth";
import { AppError } from "../middleware/errorHandler";
import axios from "axios";
import * as crypto from "crypto";
import { getAllBrokers, addBroker, deleteBroker } from "../controllers/brokerController";
import validate from "../middleware/validate";
import { body, param } from "express-validator";

const router = express.Router();


router.use(auth);

const BASE_URL = "https://api.binance.com";

interface BinanceBalance {
  asset: string;
  free: string;
  locked: string;
}

interface BinanceAccountResponse {
  balances: BinanceBalance[];
}


async function getAccountInfo(apiKey: string, apiSecret: string) {
  const endpoint = "/api/v3/account";
  const timestamp = Date.now();
  const queryString = `timestamp=${timestamp}`;

  const signature = crypto
    .createHmac("sha256", apiSecret)
    .update(queryString)
    .digest("hex");

  const url = `${BASE_URL}${endpoint}?${queryString}&signature=${signature}`;

  const headers = {
    "X-MBX-APIKEY": apiKey,
  };

  try {
    const response = await axios.get(url, { headers });
    return response;
  } catch (error) {
    throw error;
  }
}


async function getAssetBalance(apiKey: string, apiSecret: string) {
  try {
    const response = await axios.post(
      "http://182.70.249.152:1101/asset-delta-balance",
      {
        api_key: apiKey,
        api_secret: apiSecret,
      }
    );
    return response.data;
  } catch (error) {
    throw error;
  }
}

/**
 * @route POST /api/broker/check-balance
 * @desc Check BTC balance from Binance API
 * @access Private
 */
router.post(
  "/check-balance", 
  body("api_key")
    .notEmpty()
    .withMessage("API key is required"),
  body("api_secret")
    .notEmpty()
    .withMessage("API secret is required"),
  validate,
  async (req, res) => {
  try {
    const { api_key, api_secret } = req.body;
    console.log(api_key, api_secret);

    // Validate required fields
    if (!api_key || !api_secret) {
      throw new AppError(
        "Please provide api_key and api_secret",
        400,
        "missing-credentials"
      );
    }

    const response = await getAccountInfo(api_key, api_secret);

    if (response.status === 200) {
      const profile = response.data as BinanceAccountResponse;
      if ("balances" in profile) {
        const btcBalance = profile.balances.find(
          (item: BinanceBalance) => item.asset === "BTC"
        );
        if (btcBalance) {
          return res.status(200).json({
            status: "success",
            message: "Balance retrieved successfully",
            data: {
              btc_balance: parseFloat(btcBalance.free),
              btc_locked: parseFloat(btcBalance.locked),
            },
          });
        } else {
          return res.status(200).json({
            status: "success",
            message: "No BTC balance found",
            data: null,
          });
        }
      } else {
        return res.status(200).json({
          status: "error",
          message: "No balances found in account",
          data: null,
        });
      }
    } else {
      return res.status(200).json({
        status: "error",
        message: `API Error: ${response.statusText}`,
        data: null,
      });
    }
  } catch (error: any) {
    return res.status(200).json({
      status: "error",
      message: `Error: ${error.message}`,
      data: null,
    });
  }
});

/**
 * @route POST /api/broker/asset-delta-balance
 * @desc Get asset balance from Delta Exchange
 * @access Private
 */
router.post(
  "/asset-delta-balance", 
  body("api_key")
    .notEmpty()
    .withMessage("API key is required"),
  body("api_secret")
    .notEmpty()
    .withMessage("API secret is required"),
  validate,
  async (req, res) => {
  try {
    const { api_key, api_secret } = req.body;

    // Validate required fields
    if (!api_key || !api_secret) {
      throw new AppError(
        "Please provide api_key and api_secret",
        400,
        "missing-credentials"
      );
    }

    // Get current balance from the external API
    const response = await getAssetBalance(api_key, api_secret);

    // Return the response as-is from the external API
    return res.status(200).json(response);
  } catch (error: any) {
    return res.status(400).json({
      status: "error",
      message: error.message,
      data: error,
    });
  }
});

// Broker CRUD routes
router.get("/", getAllBrokers); 
router.post(
  "/", 
  body("name")
    .notEmpty()
    .withMessage("Broker name is required"),
  body("apiUrl")
    .optional()
    .isURL()
    .withMessage("API URL must be a valid URL"),
  validate,
  addBroker
);   
router.delete(
  "/:id", 
  param("id")
    .isMongoId()
    .withMessage("Please provide a valid broker ID"),
  validate,
  deleteBroker
);


export default router;

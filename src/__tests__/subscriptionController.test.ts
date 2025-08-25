import { getUserSubscriptions } from "../controllers/subscriptionController";
import BotSubscription from "../models/BotSubscription";
describe("Subscription Controller - getUserSubscriptions", () => {
  it("should return paginated subscriptions for user", async () => {
    // Mock req, res, next
    // Mock BotSubscription.aggregate and countDocuments
    // Check paginated result shape and data
  });

  it("should search subscription by bot name", async () => {
    // Mock search param, aggregate pipeline, and result
  });

  it("should restrict regular user from accessing other users subscriptions", async () => {
    // Send userId param as regular user, expect error
  });

  it("should allow admin to access any user's subscriptions", async () => {
    // Send userId param as admin, expect success
  });
});
const express = require("express");
const router = express.Router();
const {
  createPayment,
  getPaymentByOrder,
} = require("../controllers/payments.controller");

router.post("/orders/:id/payment", createPayment);
router.get("/orders/:id/payment", getPaymentByOrder);

module.exports = router;

const express = require("express");
const { Order } = require("../models/order");
const { Income } = require("../models/income");
const { Product } = require("../models/product");
const { User } = require("../models/user");
const router = express.Router();
const mongoose = require('mongoose');

router.post("/newOrder", async (req, res) => {
    console.log("Request Payload:", req.body);
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const validationErrors = [];

    // Find user
    const user = await User.findById(req.body.user).session(session);
    if (!user) {
      console.log("User not found.");
      return res.status(400).send("User not found.");
      
    }

    // Process order items
    const orderItems = await Promise.all(
      req.body.orderItems.map(async (orderItem) => {
        const product = await Product.findById(orderItem.product).session(session);

        // Validate product stock
        if (!product) {
          validationErrors.push(`Product with ID ${orderItem.product} not found.`);
          return null;
        }
        if (product.stock < orderItem.quantity) {
          validationErrors.push(`Not enough stock for product ${product.name}.`);
          return null;
        }

        // Deduct stock
        product.stock -= orderItem.quantity;
        await product.save({ session });

        return {
          name: product.name,
          quantity: orderItem.quantity,
          price: product.price,
          product: product._id,
        };
      })
    );

    // Check validation errors
    if (validationErrors.length > 0) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).send(validationErrors.join("\n"));
    }

    // Calculate order totals
    const itemsPrice = orderItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const taxPrice = itemsPrice * 0.12; // Assuming 12% tax
    const totalPrice = itemsPrice + taxPrice;

    // Create order
    const order = new Order({
      user: req.body.user,
      orderItems,
      itemsPrice,
      taxPrice,
      totalPrice,
      paymentMethod: req.body.paymentMethod,
      referenceNumber: req.body.referenceNumber,
      createdAt: Date.now(),
    });

    const savedOrder = await order.save({ session });

    // Create income record
    const income = new Income({
      orderItems: orderItems.map((item) => ({
        price: item.price,
        product: item.product,
      })),
      itemsPrice,
      taxPrice,
      totalPrice,
      date: Date.now(),
    });

    await income.save({ session });

    // Commit transaction
    await session.commitTransaction();
    session.endSession();

    return res.status(201).send({
      success: true,
      message: "Order created successfully.",
      order: savedOrder,
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error("Error during order creation:", error.message);
    return res.status(500).send("Internal Server Error.");
  }
});

module.exports = router;

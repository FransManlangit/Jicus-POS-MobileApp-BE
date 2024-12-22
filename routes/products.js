const express = require("express");
const { Product } = require("../models/product");
const router = express.Router();
const multer = require("multer");
const cloudinary = require("cloudinary");

const FILE_TYPE_MAP = {
  "image/png": "png",
  "image/jpeg": "jpeg",
  "image/jpg": "jpg",
};

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const isValid = FILE_TYPE_MAP[file.mimetype];
    let uploadError = new Error("invalid image type");

    if (isValid) {
      uploadError = null;
    }
    cb(uploadError, "public/uploads");
  },
  filename: function (req, file, cb) {
    const fileName = file.originalname.split(" ").join("-");
    const extension = FILE_TYPE_MAP[file.mimetype];
    cb(null, `${fileName}-${Date.now()}.${extension}`);
  },
});

const uploadOptions = multer({ storage: storage });

router.post(
  "/createProduct",
  uploadOptions.array("images"),
  async (req, res, next) => {
    try {
      let imagesLinks = [];

      if (req.files && req.files.length > 0) {
        for (let file of req.files) {
          const result = await cloudinary.v2.uploader.upload(file.path, {
            folder: "products",
          });

          imagesLinks.push({
            public_id: result.public_id,
            url: result.secure_url,
          });
        }
      } else {
        return res
          .status(400)
          .json({ success: false, message: "No images provided" });
      }

      req.body.images = imagesLinks;

      const product = await Product.create(req.body);

      res.status(201).json({
        success: true,
        product,
      });
    } catch (error) {
      next(error);
    }
  }
);

router.get(`/:id`, async (req, res) => {
  const product = await Product.findById(req.params.id);

  if (!product) {
    return next(new ErrorHandler("Product not found", 404));
  }
  res.status(200).json({
    success: true,
    product,
  });
});

router.put("/:id", uploadOptions.array("images"), async (req, res) => {
  let product = await Product.findById(req.params.id);

  if (!product) {
    return next(new ErrorHandler("Product not found", 404));
  }

  let images = [];
  if (req.body.images) {
    if (typeof req.body.images === "string") {
      images.push(req.body.images);
    } else {
      images = req.body.images;
    }
  }

  if (images.length > 0) {
    for (let i = 0; i < product.images.length; i++) {
      await cloudinary.v2.uploader.destroy(product.images[i].public_id);
    }

    let imagesLinks = [];
    for (let i = 0; i < images.length; i++) {
      const result = await cloudinary.v2.uploader.upload(images[i], {
        folder: "products",
      });
      imagesLinks.push({
        public_id: result.public_id,
        url: result.secure_url,
      });
    }

    req.body.images = imagesLinks;
  } else {
    req.body.images = product.images;
  }

  product = await Product.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
    useFindAndModify: false,
  });

  console.log(product);
  return res.status(200).json({
    success: true,
    product,
  });
});

router.delete(`/:id`, async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return next(new ErrorHandler("Product not found", 404));
    }

    await product.deleteOne();

    res.status(200).json({
      success: true,
      message: "Product deleted",
    });
  } catch (error) {
    next(error);
  }
});

router.get(`/`, async (req, res) => {
  console.log(req.query);
  let filter = {};
  if (req.query.categories) {
    filter = { category: req.query.categories.split(",") };
  }
  const productList = await Product.find(filter).populate("category");
  if (!productList) {
    res.status(500).json({ success: false });
  }
  res.send(productList);
});

router.get(`/:id`, async (req, res) => {
  const product = await Product.findById(req.params.id).populate("category");

  if (!product) {
    res.status(500).json({ success: false });
  }
  res.send(product);
});


router.get(`/:id`, async (req, res) => {
    const totalSales = await Order.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: "$itemsPrice" },
        },
      },
    ]);
    const sales = await Order.aggregate([
      { $project: { _id: 0, orderItems: 1, totalPrice: 1 } },
      { $unwind: "$orderItems" },
      {
        $group: {
          _id: { product: "$orderItems.name" },
          total: {
            $sum: { $multiply: ["$orderItems.price", "$orderItems.quantity"] },
          },
        },
      },
    ]);
  
    if (!totalSales) {
      return next(new ErrorHandler("error sales ", 404));
    }
    if (!sales) {
      return next(new ErrorHandler("error sales ", 404));
    }
    let totalPercentage = {};
    totalPercentage = sales.map((item) => {
      // console.log(((item.total / totalSales[0].total) * 100).toFixed(2));
      percent = Number(((item.total / totalSales[0].total) * 100).toFixed(2));
      total = {
        name: item._id.product,
        percent,
      };
      return total;
    });
    res.status(200).json({
      success: true,
      totalPercentage,
    });
  });

module.exports = router;

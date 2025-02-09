import { Request, RequestHandler, Response } from "express";
import { AuthRequest } from "../../../middleware/authMiddleware";
import {
  addProductSchema,
  addProductVariantSchema,
  deleteProductQuerySchema,
  reActivateProductSchema,
  updateQuantitySchema,
  validIdSchema,
} from "../../../types/productTypes";
import { ProductModel } from "../../../models/product/productModel";
import { DbSessionRequest } from "../../../middleware/sessionMiddleware";
import {
  IProductVariant,
  IQuantity,
  ProductVariantModel,
} from "../../../models/product/productVariantModel";
import {
  IProductStockUpdate,
  IObjectId,
  IProductRef,
} from "../../../types/modalTypes";
import { ClientSession } from "mongoose";

// Add a product
export const addProduct: RequestHandler = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    // validate productDetails
    const { error, value } = addProductSchema.validate(req.body);
    if (error) {
      res.status(400).json({
        message:
          "Validation failed: " + error.details[0].message.replace(/\"/g, ""),
      });
      return;
    }
    const { name, description, category, subCategory } = value;
    const product = await ProductModel.create({
      name,
      description,
      category,
      subCategory,
    });
    if (!product) {
      res.status(400).json({ message: "Failed to add product" });
      return;
    }
    res
      .status(200)
      .json({ message: "Product added successfully", data: product });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Server Error" });
  }
};

// Add product variants (starting)
export const addProductVariant = async (
  req: DbSessionRequest,
  res: Response
) => {
  try {
    // validate productDetails
    const { error, value } = addProductVariantSchema.validate({
      variants: req.body.variants,
      productId: req.params.productId,
    });
    if (error) {
      res.status(400).json({
        message:
          "Validation failed: " + error.details[0].message.replace(/\"/g, ""),
      });
      return;
    }
    const {
      productId,
      variants,
    }: { productId: IObjectId; variants: IProductVariant[] } = value;
    // check if product exists and if it already has variants
    const product = await ProductModel.findById(productId);
    if (!product) {
      res.status(404).json({ message: "Product not found" });
      return;
    }
    if (product.status === "Active") {
      res.status(400).json({ message: "Product variants already exist" });
      return;
    }
    const variantIds: IObjectId[] = [];
    // add variants and check their images & remove their expiry (link them)
    const addVariantError: string[] = [];
    for (let index = 0; index < variants.length; index++) {
      const variant = variants[index];
      const { success, productVariantId, errorMessage } =
        await ProductVariantModel.addVariant(
          variant,
          productId,
          req.dbSession as ClientSession
        );
      if (!success) {
        addVariantError.push(
          `Product variant at index: ${index} addition failed ( ${errorMessage} )`
        );
      } else {
        variantIds.push(productVariantId as IObjectId);
      }
    }
    if (addVariantError.length > 0) {
      res
        .status(400)
        .json({ message: "Invalid Product: " + addVariantError.join(", ") });
      return;
    }
    // remove expiry and update product at once
    const { success, errorMessage } = await ProductModel.removeExpiry(
      productId,
      variantIds,
      req.dbSession as ClientSession
    );
    if (!success) {
      res.status(400).json({ message: "Invalid product:" + errorMessage });
      return;
    }
    res.status(200).json({ message: "Product variants added successfully" });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Server Error" });
  }
};

// Update Variant stock (Add items) {size, quantity}
export const restockProduct = async (req: DbSessionRequest, res: Response) => {
  try {
    // validate productDetails
    const { error, value } = updateQuantitySchema.validate({
      productId: req.params.productId,
      details: req.body,
    });
    if (error) {
      res.status(400).json({
        message:
          "Validation failed: " + error.details[0].message.replace(/\"/g, ""),
      });
      return;
    }
    const { productId }: { productId: IObjectId } = value;
    const stock: IProductRef[] = value.details.stock;

    const product = await ProductModel.findById(productId);
    if (!product) {
      res.status(404).json({ message: "Product not found" });
      return;
    }
    // ensure the variants belong to the same product
    const variantUnavailable = stock
      .map((stockElement) => {
        // if it doesn't belongs to same product
        if (!product.variants.includes(stockElement.variant as IObjectId)) {
          return `Invalid variant ${stockElement.variant}`;
        }
        return null;
      })
      .filter((errorMessage) => errorMessage !== null);
    if (variantUnavailable.length > 0) {
      res.status(400).json({ message: "Invalid product variants" });
      return;
    }
    const { success, errorMessage } = await ProductVariantModel.updateQuantity(
      "restock",
      stock,
      req.dbSession as ClientSession
    );
    if (!success) {
      res.status(400).json({
        message: `Failed to restock '${product.name}' of id: ${errorMessage}`,
      });
      return;
    }
    res.status(200).json({ message: "Product successfully restocked" });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Server Error" });
  }
};

// Delete a product with reset stock option
export const deleteProduct = async (req: DbSessionRequest, res: Response) => {
  try {
    const { error, value } = deleteProductQuerySchema.validate({
      Id: req.params.productId,
      clearStock: req.query.clearStock,
    });
    if (error) {
      res.status(400).json({
        message:
          "Validation failed: " + error.details[0].message.replace(/\"/g, ""),
      });
      return;
    }
    // Get validated query parameters
    const { clearStock = "false", Id: productId } = value;
    const session = req.dbSession as ClientSession;
    // soft delete for the product
    const updatedProduct = await ProductModel.findByIdAndUpdate(
      productId,
      { $set: { status: "Inactive" } },
      { new: true, session }
    );
    if (!updatedProduct) {
      res.status(404).json({ message: "Product not found" });
      return;
    }
    const updateObj: IProductStockUpdate = { status: "Inactive" };
    if (clearStock === "true") {
      updateObj.quantity = [];
      updateObj.stockStatus = "Out of Stock";
      updateObj.totalQuantity = 0;
    }
    //update its variants' status and reset their quantity
    const updatedVariants = await ProductVariantModel.updateMany(
      { _id: { $in: updatedProduct.variants } },
      { $set: updateObj },
      { session }
    );
    if (!updatedVariants) {
      res.status(400).json({ message: "Failed to delete product" });
      return;
    }
    res.status(200).json({ message: "Product deleted successfully" });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Server Error" });
  }
};

// Delete a variant with reset stock option
export const deleteProductVariant = async (
  req: DbSessionRequest,
  res: Response
) => {
  try {
    const { error, value } = deleteProductQuerySchema.validate({
      Id: req.params.variantId,
      clearStock: req.query.clearStock,
    });
    if (error) {
      res.status(400).json({
        message:
          "Validation failed: " + error.details[0].message.replace(/\"/g, ""),
      });
      return;
    }
    const { clearStock = "false", Id: variantId } = value;
    const updateObj: IProductStockUpdate = { status: "Inactive" };
    if (clearStock === "true") {
      updateObj.quantity = [];
      updateObj.stockStatus = "Out of Stock";
      updateObj.totalQuantity = 0;
    }
    // check if it exists and set its status to Inactive and update its product
    const productVarUpdate = await ProductVariantModel.findOneAndUpdate(
      { _id: variantId, status: "Active" },
      { $set: updateObj }
    );
    if (!productVarUpdate) {
      res.status(400).json({ message: "Failed to delete product" });
      return;
    }
    res.status(200).json({ message: "Product variant successfully" });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Server Error" });
  }
};

export const reActivateProduct = async (
  req: DbSessionRequest,
  res: Response
) => {
  try {
    const { error, value } = reActivateProductSchema.validate({
      productId: req.params.productId,
      activateAll: req.query.all ? req.query.all : "true",
      variants: req.body.variants,
    });
    if (error) {
      res.status(400).json({
        message:
          "Validation failed: " + error.details[0].message.replace(/\"/g, ""),
      });
      return;
    }
    const {
      productId,
      variants,
    }: { productId: IObjectId; variants: IObjectId[] } = value;
    const session = req.dbSession as ClientSession;
    // soft delete for the product
    const updatedProduct = await ProductModel.findByIdAndUpdate(
      productId,
      { $set: { status: "Active" } },
      { new: true, session }
    );
    if (!updatedProduct) {
      res.status(404).json({ message: "Product not found" });
      return;
    }
    if(variants){
      const variantErrors = variants
        .map((variantId, index) => {
          if (updatedProduct.variants.includes(variantId)) {
            return null;
          }
          return `Invalid variant ${variantId.toString()} at index: ${index}`;
        })
        .filter((elem) => elem !== null);
      if (variantErrors.length > 0) {
        res.status(400).json({ message: variantErrors.join(".") });
        return;
      }
    }
    //update its variants' status and reset their quantity
    const updatedVariants = await ProductVariantModel.updateMany(
      { _id: { $in: variants?variants:updatedProduct.variants }, product: productId },
      { $set: { status: "Active" } },
      { new: true, session }
    );
    if (updatedVariants.matchedCount !== updatedVariants.modifiedCount) {
      res.status(400).json({ message: "Product re-activation failed" });
      return;
    }
    res.status(200).json({ message: "Product activated successfully" });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Server Error" });
  }
};

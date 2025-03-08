import { Response, RequestHandler, NextFunction } from "express";

import { AuthRequest } from "../../middleware/authMiddleware";
import { CartModel, ICart } from "../../models/cartModel";
import {
  addToCartSchema,
  deleteCartProductSchema,
  updateCartQuantitySchema,
} from "../../types/cartControllerTypes";
import {
  IProductVariant,
  ProductVariantModel,
} from "../../models/product/productVariantModel";
import { IOrderQuantity } from "../../types/modalTypes";
import { HttpError } from "../../utils/customErrors";

// get Cart
export const getCart: RequestHandler = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const cartData: ICart | null = await CartModel.findById(req.cartId)
      .populate({
        path: "products.variant",
        select: "-quantity",
        populate: {
          path: "product",
          select: "name rating -_id",
        },
      })
      .select("-products.quantity._id -products._id");
    if (!cartData) {
      throw new HttpError("Cart not available", 404);
    }
    if (cartData.products.length === 0) {
      res.status(200).json({
        message: "Cart is empty",
        data: { products: [], totalPrice: 0 },
      });
      return;
    }

    const totalPrice = await cartData.getTotalPrice();

    res.status(200).json({
      message: "Successful",
      data: { products: cartData.products, totalPrice },
    });
  } catch (error: any) {
    return next(error);
  }
};

// Add item to cart
export const addToCart: RequestHandler = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const cartId = req.cartId;
    // get the variantId, quantity size, color ** define Joi
    const { error, value } = addToCartSchema.validate(req.body);
    if (error) {
      throw new HttpError(
        "Validation failed: " + error.details[0].message.replace(/\"/g, ""),
        400
      );
    }
    const { variantId, size, quantity: requestedQuantity } = value;
    // ensure variant exists and is not Out of Stock or Inactive
    const variantData = await ProductVariantModel.findById(variantId, {
      quantity: { $elemMatch: { size } },
      stockStatus: 1,
      status: 1,
    });

    if (!variantData || variantData.quantity.length === 0) {
      const message: string = !variantData
        ? "Product not found"
        : "Requested size isn't available";
      throw new HttpError(message, 400);
    }
    const quantityLeft = variantData.quantity[0].quantityLeft;

    if (
      requestedQuantity > quantityLeft ||
      variantData.stockStatus === "Out of Stock" ||
      variantData.status === "Inactive"
    ) {
      let message =
        requestedQuantity > quantityLeft
          ? "Product stock limit reached"
          : "Product currently unavailable or out of stock";
      throw new HttpError(message, 400);
    }

    const cartData = await CartModel.findById(cartId, {
      products: { $elemMatch: { variant: variantId } },
    });
    if (!cartData) {
      throw new HttpError("Cart not available", 404);
    }

    let sizeExists: boolean = false;
    let updatedCart: ICart | null = null;
    // if cart doesnt have the product
    if (cartData.products.length === 0) {
      updatedCart = await CartModel.findByIdAndUpdate(
        cartId,
        {
          $addToSet: {
            products: {
              variant: variantId,
              quantity: { size, quantity: requestedQuantity },
            },
          },
        },
        { new: true }
      );
    } else {
      // check if they're already added  (increase the quantity)
      let sizeIndex: number = 0;
      const cartProductQuantity = cartData.products[0].quantity;
      for (let i = 0; i < cartProductQuantity.length; i++) {
        const quantity = cartProductQuantity[i];
        if (quantity.size === size) {
          sizeExists = true;
          sizeIndex = i;
          break;
        }
      }
      if (sizeExists) {
        // if the size exists & added quantity < than that left
        if (
          cartProductQuantity[sizeIndex].quantity + requestedQuantity >
          quantityLeft
        ) {
          throw new HttpError("Product stock limit reached", 400);
        }
        updatedCart = await CartModel.findOneAndUpdate(
          {
            _id: cartId,
            "products.variant": variantId,
            "products.quantity.size": size,
          },
          {
            $inc: {
              "products.$.quantity.$[elem].quantity": requestedQuantity,
            },
          },
          { arrayFilters: [{ "elem.size": size }], new: true }
        );
      } else {
        // then add the new size object
        updatedCart = await CartModel.findOneAndUpdate(
          { _id: cartId, "products.variant": variantId },
          {
            $addToSet: {
              "products.$.quantity": { quantity: requestedQuantity, size },
            },
          },
          { new: true }
        );
      }
    }
    if (!updatedCart) {
      throw new HttpError("Failed to update cart", 400);
    }
    const totalPrice = await updatedCart.getTotalPrice();
    res.status(200).json({
      message: "Product successfully added",
      data: { products: updatedCart.products, totalPrice },
    });
  } catch (error: any) {
    return next(error);
  }
};

// Update existing items (increase/decrease quantity)
export const updateProductCartQuantity: RequestHandler = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    // {operation nd size, productId from params}
    const cartId = req.cartId;
    const { error, value } = updateCartQuantitySchema.validate({
      variantId: req.params.variantId,
      updateDetails: req.body,
    });
    if (error) {
      throw new HttpError(
        "Validation failed: " + error.details[0].message.replace(/\"/g, ""),
        400
      );
    }
    const { variantId } = value;
    const { size, operation } = value.updateDetails;

    const variantData = await ProductVariantModel.findById(variantId, {
      quantity: { $elemMatch: { size } },
      stockStatus: 1,
      status: 1,
    });

    if (!variantData || variantData.quantity.length === 0) {
      const message: string = !variantData
        ? "Product not found"
        : "Requested size isn't available";
      throw new HttpError(message, 404);
    }
    const quantityLeft = variantData.quantity[0].quantityLeft;

    if (
      variantData.stockStatus === "Out of Stock" ||
      variantData.status === "Inactive"
    ) {
      res
        .status(400)
        .json({ message: "Product currently unavailable or out of stock" });
      return;
    }

    const cartData = await CartModel.findOne(
      {
        // ensure size exists in the cart
        _id: cartId,
        "products.variant": variantId,
        "products.quantity.size": size,
      },
      {
        products: {
          $elemMatch: {
            variant: variantId,
            "quantity.size": size,
          },
        },
      }
    );
    if (!cartData) {
      throw new HttpError("Cart has no matching product", 404);
    }
    let sizeIndex: number = 0;
    const cartProductQuantity = cartData.products[0].quantity;
    for (let i = 0; i < cartProductQuantity.length; i++) {
      const quantity = cartProductQuantity[i];
      if (quantity.size === size) {
        sizeIndex = i;
        break;
      }
    }
    const quantity = cartData.products[0].quantity[sizeIndex].quantity;
    if (operation === "increment" || operation === "decrement") {
      const quantityLeft = variantData.quantity[0].quantityLeft;
      const quantityChange = operation === "increment" ? 1 : -1;

      // if increments it exceeds quantity left
      if (operation === "increment" && quantityLeft < quantity + 1) {
        throw new HttpError("Product stock limit reached", 400);
      }

      if (operation === "decrement" && quantity <= 1) {
        res
          .status(400)
          .json({ message: "Cannot decrement below minimum quantity" });
        return;
      }

      const updatedCart = await CartModel.findOneAndUpdate(
        {
          _id: cartId,
          "products.variant": variantId,
          "products.quantity.size": size,
        },
        { $inc: { "products.$.quantity.$[elem].quantity": quantityChange } },
        { arrayFilters: [{ "elem.size": size }], new: true }
      );

      if (!updatedCart) {
        throw new HttpError("Failed to update cart", 404);
      }
      // calculate price
      const totalPrice = await updatedCart.getTotalPrice();
      res.status(200).json({
        message: "Cart updated successfully",
        data: { products: updatedCart.products, totalPrice },
      });
    }
  } catch (error: any) {
    return next(error);
  }
};

export const deleteCartProduct: RequestHandler = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { error, value } = deleteCartProductSchema.validate({
      variantId: req.params.variantId,
      deleteDetails: req.body,
    });
    if (error) {
      throw new HttpError(
        "Validation failed: " + error.details[0].message.replace(/\"/g, ""),
        400
      );
    }
    const cartId = req.cartId;
    const { variantId } = value;
    const { size } = value.deleteDetails;

    const cartData = await CartModel.findOne(
      {
        _id: cartId,
        "products.variant": variantId,
        "products.quantity.size": size,
      },
      {
        products: {
          $elemMatch: {
            variant: variantId,
            "quantity.size": size,
          },
        },
      }
    );
    if (!cartData) {
      throw new HttpError("Cart has no matching product", 404);
    }
    const productQuantity = cartData.products[0].quantity;
    let updatedCart: ICart | null = null;
    if (productQuantity.length <= 1) {
      // delete fully then
      updatedCart = await CartModel.findByIdAndUpdate(
        cartId,
        { $pull: { products: { variant: variantId } } },
        { new: true }
      );
    } else {
      updatedCart = await CartModel.findOneAndUpdate(
        { _id: cartId, "products.variant": variantId },
        { $pull: { "products.$.quantity": { size } } },
        { new: true }
      );
    }
    if (!updatedCart) {
      throw new HttpError("Failed to remove product", 400);
    }
    const totalPrice = await updatedCart.getTotalPrice();
    res.status(200).json({
      message: "Product removed successfully",
      data: { products: updatedCart.products, totalPrice },
    });
  } catch (error: any) {
    return next(error);
  }
};

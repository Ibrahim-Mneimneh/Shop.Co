import { Request, RequestHandler, Response } from "express";
import { DbSessionRequest } from "../../../middleware/sessionMiddleware";
import {
  updateVariantSaleSchema,
  validIdSchema,
} from "../../../types/productTypes";
import { ClientSession } from "mongoose";
import {
  IProductVariant,
  ProductVariantModel,
} from "../../../models/product/productVariantModel";
import {
  EndSaleModel,
  StartSaleModel,
} from "../../../models/product/productSale";
import { HttpError } from "../../../utils/customErrors";

// Update or Add a Sale
export const updateVariantSale = async (
  req: DbSessionRequest,
  res: Response
) => {
  try {
    const data: {
      saleOptions: {
        startDate?: Date;
        endDate?: Date;
        discountPercentage?: number;
      };
      productVarId: string;
    } = { productVarId: req.params.variantId, saleOptions: req.body };

    const { error, value } = updateVariantSaleSchema.validate(data);
    if (error) {
      throw new HttpError(
        "Validation failed: " + error.details[0].message.replace(/\"/g, ""),
        400
      );
    }
    const session = req.dbSession as ClientSession;
    const { productVarId, saleOptions } = value;
    const product = await ProductVariantModel.findById(productVarId);
    if (!product) {
      throw new HttpError("Product not found", 404);
    }

    const { startDate, endDate, discountPercentage } = saleOptions;
    // if the product is on sale (allow partial update)
    if (
      product.saleOptions &&
      product.saleOptions.startDate &&
      product.saleOptions.endDate &&
      product.saleOptions.discountPercentage
    ) {
      const currentSale = product.saleOptions;
      if (startDate && startDate !== currentSale.startDate) {
        if (!endDate && currentSale.endDate <= startDate) {
          // ensure endDate>start
          throw new HttpError(
            "Validation failed: startDate should be earlier than endDate",
            400
          );
        }
        // startSale update; remove prodvarId from old startSale to new one
        const saleUpdateOps = [
          {
            updateOne: {
              filter: { startDate: currentSale.startDate },
              update: { $pull: { productVariants: productVarId } },
            },
          },
          {
            updateOne: {
              filter: { startDate },
              update: { $addToSet: { productVariants: productVarId } },
              upsert: true,
            },
          },
        ];
        const startSaleUpdate = await StartSaleModel.bulkWrite(saleUpdateOps, {
          session,
        });
        if (startSaleUpdate.ok !== 1 || startSaleUpdate.hasWriteErrors()) {
          throw new HttpError("Failed to update sale", 400);
        }
        // update productVar startDate
        currentSale.startDate = startDate;
      } else {
        // no startDate
        if (endDate && endDate !== currentSale.endDate) {
          if (!startDate && currentSale.startDate >= endDate) {
            // Ensure new end > start (old)
            throw new HttpError(
              "Validation failed: startDate should be earlier than endDate",
              400
            );
          }
          // update endSale
          const saleUpdateOps = [
            {
              updateOne: {
                filter: { endDate: currentSale.endDate },
                update: { $pull: { productVariants: productVarId } },
              },
            },
            {
              updateOne: {
                filter: { endDate: endDate },
                update: { $addToSet: { productVariants: productVarId } },
                upsert: true,
              },
            },
          ];
          const endSaleUpdate = await EndSaleModel.bulkWrite(saleUpdateOps, {
            session,
          });
          if (endSaleUpdate.ok !== 1 || endSaleUpdate.hasWriteErrors()) {
            throw new HttpError("Failed to update sale", 400);
          }
          // update productVar endDate
          currentSale.endDate = endDate;
        }
      }
      // update sale percentage if its given
      if (discountPercentage) {
        const salePrice =
          Math.round(
            product.originalPrice * (1 - discountPercentage / 100) * 100
          ) / 100;
        currentSale.discountPercentage = discountPercentage;
        currentSale.salePrice = salePrice;
      }
      await product.save({ session });
      res.status(200).json({ message: "Sale updated successfully" });
      return;
    } else {
      // Not on sale , Add sale strictly require all 3 attributes
      if (!startDate || !endDate || !discountPercentage) {
        throw new HttpError(
          "Validation failed: 'startDate', 'endDate' & 'discountPercentage' are required",
          400
        );
      }
      // fetch for start and endDates if not found create one
      const startSale = await StartSaleModel.updateOne(
        { startDate: startDate },
        { $addToSet: { productVariants: productVarId } },
        { upsert: true, session }
      );
      const endSale = await EndSaleModel.updateOne(
        { endDate: endDate },
        { $addToSet: { productVariants: productVarId } },
        { upsert: true, session }
      );
      if (!startSale.acknowledged || !endSale.acknowledged) {
        throw new HttpError("Failed to add sale", 400);
      }
      const salePrice =
        Math.round(
          product.originalPrice * (1 - discountPercentage / 100) * 100
        ) / 100;
      product.saleOptions = {
        startDate,
        endDate,
        discountPercentage,
        salePrice,
      };
      await product.save({ session });
      res.status(200).json({ message: "Sale created successfully" });
      return;
    }
  } catch (error: any) {
    throw new HttpError(error.message, 500);
  }
};

// delete Variant Sale
export const deleteVariantSale = async (
  req: DbSessionRequest,
  res: Response
) => {
  try {
    const session = req.dbSession;
    const { error, value } = validIdSchema.validate(req.params.variantId);
    if (error) {
      throw new HttpError(
        "Validation failed: " + error.details[0].message.replace(/\"/g, ""),
        400
      );
    }
    const variantId = value;
    const variantSaleData = await ProductVariantModel.findById(variantId, {
      isOnSale: 1,
      saleOptions: 1,
    });
    if (!variantSaleData) {
      throw new HttpError("Product not found", 404);
    }
    const { isOnSale, saleOptions } = variantSaleData;
    let updatedVrainat: IProductVariant | null = null;

    // Variant is is onSale or pending it ("saleOptions is loaded")
    if (saleOptions && saleOptions?.startDate && saleOptions?.endDate) {
      const { startDate, endDate } = saleOptions;
      if (isOnSale) {
        // sale started
        const endSaleData = await EndSaleModel.findOneAndUpdate(
          { endDate },
          { $pull: { productVariants: variantId } },
          { session }
        );
        if (!endSaleData) {
          throw new HttpError("Failed to update sale", 400);
        }
      } else {
        // sale hasn't started
        const startSaleData = await StartSaleModel.findOneAndUpdate(
          { startDate },
          { $pull: { productVariants: variantId } },
          { session }
        );
        const endSaleData = await EndSaleModel.findOneAndUpdate(
          { endDate },
          { $pull: { productVariants: variantId } },
          { session }
        );
        if (!startSaleData || !endSaleData) {
          throw new HttpError("Failed to remove sale", 400);
        }
      }
      // update variant
      updatedVrainat = await ProductVariantModel.findByIdAndUpdate(
        variantId,
        {
          $set: { isOnSale: false, saleOptions: null },
        },
        { new: true, session }
      );
    } else {
      // if there is no sale
      res
        .status(400)
        .json({ message: "Failed to remove sale. Product not on sale" });
      return;
    }
    res
      .status(200)
      .json({ message: "Sale removed successfully", data: updatedVrainat });
  } catch (error: any) {
    throw new HttpError(error.message, 500);
  }
};

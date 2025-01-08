import mongoose, {
  ClientSession,
  Document,
  Model,
  Schema,
  Types,
} from "mongoose";
import { IObjectId, IOrderQuantity, IProductRef } from "../../types/modalTypes";
import { ProductImageModel } from "../product/productImageModel";
import { console } from "inspector";

export interface IQuantity {
  size: string;
  quantityLeft: number;
}
export interface ISaleOptions {
  startDate: Date;
  endDate: Date;
  discountPercentage: number;
  salePrice: number;
}
// Many attributes can be further introduced such as dimension (measurements), other currency, fixed sale number (not percentage), and count for purchase or rating ;)
export interface IProductVariant extends Document {
  _id: Types.ObjectId;
  color: string;
  quantity: IQuantity[];
  images: Types.ObjectId[];
  originalPrice: number;
  isOnSale: boolean;
  saleOptions?: ISaleOptions;
  status: "Active" | "Inactive";
  unitsSold: number;
  stockStatus: "In Stock" | "Out of Stock";
  product: Types.ObjectId;
}
interface IProductVariantModel extends Model<IProductVariant> {
  addVariant(
    variant: IProductVariant,
    product: IObjectId,
    session: ClientSession
  ): Promise<{
    success: boolean;
    productVariantId?: IObjectId;
    errorMessage: string;
  }>;
  updateQuantity(
    operation: "restock" | "purchase",
    stock: IProductRef[],
    session: ClientSession
  ): Promise<{ success: boolean; errorMessage: string; stock?: IProductRef[] }>;
}

const productVariantSchema = new Schema<IProductVariant>(
  {
    quantity: [
      {
        size: {
          type: String,
          required: true,
          enum: ["XXS", "XS", "S", "M", "L", "XL", "XXL", "XXXL", "One-Size"],
        },
        quantityLeft: {
          type: Number,
          required: true,
          default: 0,
          min: [0, "Quantity cannot be negative"],
        },
      },
    ],
    images: [{ type: Schema.Types.ObjectId, ref: "ProductImage" }],
    color: { type: String, required: true },
    originalPrice: {
      type: Number,
      required: true,
      min: [0, "Price cannot be negative"],
    },
    isOnSale: { type: Boolean, default: false },
    saleOptions: {
      type: {
        startDate: { type: Schema.Types.Date, required: true },
        endDate: { type: Schema.Types.Date, required: true },
        discountPercentage: { type: Number, min: 1, max: 99, required: true },
        salePrice: {
          type: Number,
          min: [0, "Price cannot be negative"],
          required: true,
        },
      },
    },
    status: { type: String, enum: ["Active", "Inactive"], default: "Active" },
    stockStatus: {
      type: String,
      enum: ["In Stock", "Out of Stock"],
      default: "In Stock",
    },
    unitsSold: { type: Number, min: 0, default: 0 },
    product: { type: Schema.Types.ObjectId, ref: "Product", required: true },
  },
  { timestamps: true }
);

productVariantSchema.set("toJSON", {
  transform: (doc, ret) => {
    delete ret.createdAt;
    delete ret.updatedAt;
    delete ret.status;
    delete ret.__v;
    if (!ret.isOnSale && ret.saleOptions) {
      delete ret.saleOptions;
    }
    if (ret.isOnSale && ret.saleOptions) {
      delete ret.saleOptions._id;
    }
    delete ret.unitsSold;
    delete ret.product;
    return ret;
  },
});

productVariantSchema.statics.addVariant = async function (
  variant: IProductVariant,
  productId: IObjectId,
  session: ClientSession
): Promise<{
  success: boolean;
  productVariantId?: IObjectId;
  errorMessage: string;
}> {
  try {
    // convert imageIds to ObjectId exclude duplicate images from linking
    const imageIds: IObjectId[] = [...new Set(variant.images)].map(
      (imageId) => new Types.ObjectId(imageId)
    );
    // Check images first
    let imageIdsToLink: IObjectId[] = [];
    const variantImageError = (
      await Promise.all(
        imageIds.map(async (imageId, index) => {
          const imageData = await ProductImageModel.findById(imageId);
          if (!imageData) {
            return `Image at index: ${index} not found`;
          }
          if (imageData && !imageData.isLinked) {
            imageIdsToLink.push(imageId);
          }
          return null;
        })
      )
    ).filter((errorMessage) => errorMessage !== null);
    if (variantImageError.length > 0) {
      return { success: false, errorMessage: variantImageError.join(", ") };
    }
    // Add product variant & productId
    variant.product = productId;
    const productVariant: IProductVariant = await new this(variant).save({
      session,
    });
    if (!productVariant) {
      return { success: false, errorMessage: "Failed to add product variant" };
    }

    // link images if needed
    if (imageIdsToLink && imageIdsToLink.length > 0) {
      const linkedImage: { success: boolean; errorMessage: string } =
        await ProductImageModel.linkImages(imageIdsToLink, session);
      if (!linkedImage.success) {
        return { success: false, errorMessage: linkedImage.errorMessage };
      }
    }

    return {
      success: true,
      productVariantId: productVariant._id,
      errorMessage: "",
    };
  } catch (error: any) {
    console.log("Add variant : " + error);
    throw new Error("Error adding variant: " + error.message);
  }
};

// Deals with updating quantity weather it is "restock" or "purchase"
productVariantSchema.statics.updateQuantity = async function (
  operation: "restock" | "purchase",
  stock: IProductRef[],
  session: ClientSession
): Promise<{ success: boolean; errorMessage: string; stock?: IProductRef[] }> {
  try {
    // Check for the type of operation
    if (operation === "restock") {
      for (const element of stock) {
        const elementOperations = await Promise.all(
          element.quantity.map(async (elemQuantity) => {
            const { size, quantity } = elemQuantity;
            const sizeExists = await this.exists({
              _id: element.variant,
              "quantity.size": size,
            });
            if (!sizeExists) {
              return {
                updateOne: {
                  filter: { _id: element.variant },
                  update: {
                    $push: { quantity: { quantityLeft: quantity, size } },
                  },
                  upsert: false,
                },
              };
            }
            return {
              updateOne: {
                filter: { _id: element.variant, "quantity.size": size },
                update: { $inc: { "quantity.$.quantityLeft": quantity } },
                upsert: false,
              },
            };
          })
        );

        // Update variant's quantity
        const variantResult = await this.bulkWrite(elementOperations, {
          session,
        });
        if (variantResult.modifiedCount !== element.quantity.length) {
          return { success: false, errorMessage: `${element.variant}` };
        }
      }
      return { success: true, errorMessage: "" };
    } else if (operation === "purchase") {
      // ensure that at least one item is purchased
      const purchaseErrors: {variant:IObjectId,data:IOrderQuantity}[] = [];
      let purchaseFlag: boolean = false;
      for (let productVariant of stock) {
        const { variant, quantity } = productVariant;
        const elementOperations = [];
        for (let elemQuantity of quantity) {
          const { size, quantity } = elemQuantity;
          // Fetch the variant with each item
          const variantData: IProductVariant | null = await this.findOne({
            _id: variant,
            "quantity.size": size,
          });

          // size isnt available
          if (!variantData) {
            elemQuantity.success = false;
            elemQuantity.message = `Out of Stock`;
            purchaseErrors.push({variant,data:elemQuantity});
            continue; // move to next quantity
          }
          if (variantData.status !== "Active") {
            elemQuantity.success = false;
            elemQuantity.message = `Product not available`;
            purchaseErrors.push({variant,data:elemQuantity});
            continue; // move to next quantity
          }
          // get size details and check if the requested quantity is bigger than the
          const sizeDetail = variantData.quantity.find((q) => q.size === size);
          if (sizeDetail && sizeDetail.quantityLeft < quantity) {
            elemQuantity.success = false;
            elemQuantity.message =`insufficient items left: ${sizeDetail.quantityLeft} left`;
            purchaseErrors.push({variant,data:elemQuantity});
            continue; // move to next detail
          }

          elementOperations.push({
            updateOne: {
              filter: { _id: variant, "quantity.size": size },
              update: { $inc: { "quantity.$.quantityLeft": -quantity } },
              upsert: false,
            },
          });
        }
        // check if there is operations
        if (elementOperations.length > 0) {
          // Update variant's quantity if there is no error for a product
          const variantResult = await this.bulkWrite(elementOperations, {
            session,
          });
          if (variantResult.modifiedCount !== elementOperations.length) {
            return {
              success: false,
              errorMessage: `An error occured with ${variant} purchase`,
            }; // All changes will be reversed if one purchase failed while updating
          }
          //update purchaseflag
          purchaseFlag = true;
        }
      }
      // if no elements match or if some do
      if (purchaseErrors.length > 0 || !purchaseFlag) {
        const errorMessage = purchaseErrors
          .map((err) => `${err.variant} of size: (${err.data.size}): ${err.data.message}`)
          .join(". ");

        return { success: purchaseFlag, errorMessage, stock };
      }

      return { success: true, errorMessage: "", stock };
    } else {
      return { success: false, errorMessage: "Invalid operation" };
    }
  } catch (error: any) {
    console.log(error);
    throw new Error("Error adding variant: " + error.message);
  }
};

export const ProductVariantModel = mongoose.model<
  IProductVariant,
  IProductVariantModel
>("ProductVariant", productVariantSchema);

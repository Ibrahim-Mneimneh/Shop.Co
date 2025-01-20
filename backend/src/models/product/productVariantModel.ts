import mongoose, {
  ClientSession,
  Document,
  Model,
  Schema,
  Types,
} from "mongoose";
import {
  IObjectId,
  IOrderQuantity,
  IProductRef,
  IToJSONOptions,
} from "../../types/modalTypes";
import { ProductImageModel } from "../product/productImageModel";
import { console } from "inspector";
import { IProduct } from "./productModel";

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
  cost: number;
  isOnSale: boolean;
  saleOptions?: ISaleOptions;
  status: "Active" | "Inactive";
  unitsSold: number;
  stockStatus: "In Stock" | "Out of Stock";
  product: IProduct | Types.ObjectId;
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
  ): Promise<{
    success: boolean;
    errorMessage: string;
    order?: {
      totalPrice: number;
      totalCost: number;
      products: IProductRef[];
      purchaseErrors: IProductRef[];
    };
  }>;
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
    cost: {
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
  transform: (doc, ret, options: IToJSONOptions) => {
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
    if (!options.role || options.role !== "admin") {
      delete ret.cost;
    }
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
    const imageIds: IObjectId[] = [...new Set(variant.images)];
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
): Promise<{
  success: boolean;
  errorMessage: string;
  order?: {
    totalPrice: number;
    totalCost: number;
    products: IProductRef[];
    purchaseErrors: IProductRef[];
  };
}> {
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
      // Save prices & allocate available products
      let purchaseErrors = [];
      const orderProducts: IProductRef[] = [];
      // ensure that at least one item is purchased
      let purchaseFlag: boolean = false;
      let totalPrice: number = 0;
      let totalCost: number = 0;
      // loop over products from cart
      for (let productVariant of stock) {
        let units = 0;
        const { variant, quantity } = productVariant;
        const elementOperations = [];
        // loop over variant sizes (for a user)
        for (let elemQuantity of quantity) {
          const { size, quantity } = elemQuantity;
          // Fetch the variant with each item
          const variantData: IProductVariant | null = await this.findById(
            variant
          ).populate({
            path: "product",
            options: { limit: 1 },
            select: "name category",
          });
          // size isnt available
          const { name, category } = variantData?.product as IProduct;
          if (!variantData) {
            return {success:false,errorMessage:`product ${variant} not found`}
          }
          const sizeDetail = variantData.quantity.find((q) => q.size === size);
          // if size not available or product not Active
          if (!sizeDetail || variantData.status !== "Active") {
            elemQuantity.success = false;
            elemQuantity.message = sizeDetail?`Product not available`:`Size not available`;
            purchaseErrors.push({
              variant,
              name,
              category,
              quantity: [elemQuantity],
              image: variantData.images[0]
            });
            continue; // move to next quantity
          }

          // Check if the requested quantity exceeds quantityLeft
          if (sizeDetail.quantityLeft < quantity) {
            elemQuantity.success = false;
            elemQuantity.message = `Insufficient items left: ${sizeDetail.quantityLeft} left`;
            purchaseErrors.push({
              variant,
              name,
              category,
              quantity: [elemQuantity],
              image: variantData.images[0],
            });
            continue; // move to next quantity
          }
          // Add success attributes, if update fails wont be returned
          const price = (productVariant.price = variantData.isOnSale
            ? variantData.saleOptions?.salePrice || variantData.originalPrice
            : variantData.originalPrice);

          const cost = variantData.cost;
          // Add price to totalPrice only successful
          elemQuantity.success = true;
          totalPrice += productVariant.price * quantity;
          totalCost += cost * quantity;
          units += quantity;
          // Finalize to order products
          if (orderProducts.length === 0) {
            orderProducts.push({
              variant,
              name,
              category,
              cost,
              price,
              quantity: [elemQuantity],
              units,
              image: variantData.images[0],
            });
          } else {
            let lastProductIndex = orderProducts.length - 1;
            if (orderProducts[lastProductIndex].variant !== variant) {
              orderProducts.push({
                variant,
                name,
                category,
                cost,
                price,
                quantity: [],
                units,
                image: variantData.images[0],
              });
              lastProductIndex++;
            }
            orderProducts[lastProductIndex].quantity.push(elemQuantity);
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
              errorMessage: `An error occured with product ${variant} purchase`,
            }; // All changes will be reversed if one purchase failed while updating
          }
          //update purchaseflag
          purchaseFlag = true;
        }
      }
      // if no elements match or if some do
      if (purchaseErrors.length > 0 || !purchaseFlag) {
        const errorMessage = purchaseFlag
          ? ""
          : " requested product purchase failed";
        return {
          success: purchaseFlag,
          errorMessage,
          order: {
            products: orderProducts,
            totalPrice,
            totalCost,
            purchaseErrors,
          },
        };
      }

      return {
        success: true,
        errorMessage: "",
        order: {
          products: orderProducts,
          totalPrice,
          totalCost,
          purchaseErrors,
        },
      };
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

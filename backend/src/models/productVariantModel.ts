import mongoose, {Document, Schema} from "mongoose"

export interface IProductVariant extends Document {
  color: string;
  sizes:{
    size: string
    quantityLeft: number }[],
  images: String[];
  originalPrice: Schema.Types.Decimal128;
  isOnSale: boolean;
  saleOptions?: {
    startDate: Schema.Types.Date;
    endDate: Schema.Types.Date;
    discountPercentage: number;
  };
}

const arrayNotEmpty = (val: any[]) => val.length > 0;

const productVariantSchema = new Schema<IProductVariant>({
  color:{type:String,required:true},
  sizes: [{
    size: { type: String, required: true },
    quantityLeft: { type: Number, required: true, default: 0 }}],
  images: {
  type: [{ type: String }],
  validate: [arrayNotEmpty, "Images array cannot be empty"]},
  originalPrice: { type: Schema.Types.Decimal128, required: true, min: 0 },
  isOnSale: {type:Boolean,default:false},
  saleOptions: {
  type: {
    startDate: { type: Schema.Types.Date, required: true },
    endDate: { type: Schema.Types.Date, required: true },
    discountPercentage: { type: Number, min: 1, max: 99 }
  },
  validate: {
    validator: function (this: IProductVariant) {
      return this.isOnSale ? !!this.saleOptions : !this.saleOptions;
    },
    message: "saleOptions must be provided when isOnSale is true."
  }
}
},{timestamps:true});

// Color indexing
productVariantSchema.index({ color: 1 });

// Size indexing
productVariantSchema.index({ "sizes.size": 1 });

// On sale indexing
productVariantSchema.index({ isOnSale: 1 });

// Compound indexing color and size
productVariantSchema.index({ color: 1, "sizes.size": 1 });

export const ProductVariantModel =mongoose.model<IProductVariant
>("ProductVariant",productVariantSchema);
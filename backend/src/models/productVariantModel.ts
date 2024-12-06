import mongoose,{ Document, Model, Schema,Types } from "mongoose";
import { decimal128ToNumber, IObjectId, numberToDecimal128 } from "../types/modalTypes";
import { ProductImageModel } from "./productImageModel";
import { console } from "inspector";

export interface IQuantity {
  size: string;
  quantityLeft: number;
}

export interface IProductVariant extends Document{
  _id:Types.ObjectId,
  color:string,
  quantity:IQuantity[],
  images: Types.ObjectId[];
  originalPrice: Number;
  isOnSale: boolean;
  saleOptions?: {
    startDate: Date;
    endDate: Date;
    discountPercentage: number;
    }
}
interface IProductVariantModel extends Model<IProductVariant>{
  addVariant(variant:IProductVariant):Promise<{success:boolean,productVariantId?:IObjectId,errorMessage:string}>
}

const productVariantSchema = new Schema<IProductVariant>({
    quantity: [{
        size: {type: String, required: true, enum: ["XXS","XS", "S", "M", "L", "XL", "XXL","XXXL","One-Size"]},
        quantityLeft: { type: Number, required: true, default: 0, min:[0,"Quantity cannot be negative"]}}],
    images: [{ type: Schema.Types.ObjectId,ref:"ProductImage"}],
    originalPrice:{ type: Schema.Types.Decimal128,required: true,min: [0,"Price cannot be negative"],get:decimal128ToNumber, set: numberToDecimal128 },
            isOnSale: {type:Boolean,default:false},
            saleOptions: {type:{
                startDate: { type: Schema.Types.Date, required: true },
                endDate: { type: Schema.Types.Date, required: true },
                discountPercentage: { type: Number, min: 1, max: 99 }},validate: {validator: function (this: IProductVariant) {
                    if (this.isOnSale) {
                        return (this.saleOptions && this.saleOptions.endDate > this.saleOptions.startDate);
                    }
                    return !this.saleOptions;
                    },
                    message: "saleOptions must have valid dates when isOnSale is true.",},}
                
},{timestamps:true});



export const ProductVariantModel =mongoose.model<IProductVariant
,IProductVariantModel>("ProductVariant",productVariantSchema);
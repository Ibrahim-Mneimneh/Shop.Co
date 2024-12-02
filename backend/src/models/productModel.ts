import mongoose, {Document,Types,Schema} from "mongoose"
import { decimal128ToNumber, numberToDecimal128 } from "../types/modalTypes";

export interface IQuantity {
  size: string;
  quantityLeft: number;
}

export interface IProductVariant{
  _id:Types.ObjectId,
  details:{
  color:string,
  quantity:IQuantity[],
  images: String[];
  originalPrice: Types.Decimal128;
  isOnSale: boolean;
  saleOptions?: {
    startDate: Date;
    endDate: Date;
    discountPercentage: number;
    }
  }
}

export interface IProduct extends Document {
    _id:Types.ObjectId,
    name:string,
    description:string,
    gender:String,
    category:String
    rating:Number,
    variants:IProductVariant[],
}



const arrayNotEmpty = (val: any[]):boolean => Array.isArray(val) && val.length > 0;

const validateImageUrl = (images: string[]) =>
  images.every((img) => /^(http?:\/\/)([\da-z.-]+)\.([a-z.]{2,6})([\/\w .-]*)*\/?$/.test(img));

const productSchema = new Schema<IProduct>({
    name:{type:String,required:true},
    description:{type:String, maxlength:600},
    gender:{type:String,enum:["Male","Female","Unisex"],required:true},
    category:{type:String,enum:["Jackets","Pullover","Suits","Pants","T-Shirts","Accessories"],required:true},
    rating:{type:Number,default:0.0,min:0.0,max:5.0},
    variants:[{_id:{type: Schema.Types.ObjectId, default: () => new mongoose.Types.ObjectId(),unique:true} ,details:{
                quantity: [{
                    size: {type: String, required: true, enum: ["XXS","XS", "S", "M", "L", "XL", "XXL","XXXL","One-Size"]},
                    quantityLeft: { type: Number, required: true, default: 0, min:[0,"Quantity cannot be negative"]}}],
                images: {
                    type: [{ type: String }],
                    validate: [{
                        validator: arrayNotEmpty,
                        message: "Images array cannot be empty",
                        },
                        {
                        validator: validateImageUrl,
                        message: "Each image must be a valid URL",
                        },]},
                originalPrice:{ type: Schema.Types.Decimal128,                    required: true,min: [0,"Price cannot be negative"],get:decimal128ToNumber, set: numberToDecimal128 },
                    isOnSale: {type:Boolean,default:false},
                saleOptions: {
                    type: {
                    startDate: { type: Schema.Types.Date, required: true },
                    endDate: { type: Schema.Types.Date, required: true },
                    discountPercentage: { type: Number, min: 1, max: 99 }},
                    validate: {validator: function (this: IProductVariant) {
                        if (this.details.isOnSale) {
                            return (this.details.saleOptions && this.details.saleOptions.endDate > this.details.saleOptions.startDate);
                        }
                        return !this.details.saleOptions;
                        },
                        message: "saleOptions must have valid dates when isOnSale is true.",
                        },
                }
            }}],
},{timestamps:true,versionKey: false});


// Indexing
productSchema.index({ category: 1 });  // category Indexing
productSchema.index({ gender: 1 });    // gender Indexing
productSchema.index({ rating: -1 });    // rating Indexing
productSchema.index({ isOnSale: 1 });  // sale status Indexing

productSchema.index({ category: 1, gender: 1 });  // category and gender Indexing
productSchema.index({ category: 1, isOnSale: 1 });  // category and sale status
productSchema.index({ category: 1, gender: 1, rating: -1 });  // category, gender, and rating (desc)

productSchema.index({ "variants.color": 1 }); // color Indexing
productSchema.index({ "variants.sizes.size": 1 }); // size Indexing 

// Optional text index for search functionality
productSchema.index({ name: 'text', description: 'text' });

export const ProductModel =mongoose.model<IProduct
>("Product",productSchema);